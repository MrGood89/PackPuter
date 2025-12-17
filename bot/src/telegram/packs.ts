import fs from "fs";
import type { Context } from "telegraf";
import { env } from "../env";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function buildPackShortName(title: string): string {
  const base = slugify(title) || "pack";
  const bot = env.BOT_USERNAME.toLowerCase();
  return `${base}_by_${bot}`;
}

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}

/**
 * Clean up pack name input from user
 * Handles full links, @ prefixes, etc.
 */
function cleanupPackInput(input: string): string {
  const trimmed = input.trim();
  // Allow full link: t.me/addstickers/packname
  const m = trimmed.match(/t\.me\/addstickers\/([a-zA-Z0-9_]+)/);
  if (m?.[1]) return m[1];
  return trimmed.replace(/^@/, "");
}

/**
 * Resolve sticker set name from user input
 * If user provides just "test", auto-append "_by_<bot_username>"
 * If user already provided full short name, keep it
 */
export function resolveStickerSetName(input: string): string {
  const raw = cleanupPackInput(input);

  // If user already provided full short name (contains _by_), keep it
  if (raw.toLowerCase().includes("_by_")) return raw;

  // Otherwise append bot username
  const bot = env.BOT_USERNAME.toLowerCase();
  return `${raw.toLowerCase()}_by_${bot}`;
}

/**
 * Extract emoji from sticker set response
 * Handles both emoji_list (array) and emoji (string) formats
 */
export function extractStickerSetEmoji(stickerSet: any): string | null {
  if (!stickerSet) return null;
  
  const first = stickerSet?.stickers?.[0];
  if (!first) return null;

  // Telegram sometimes returns emoji_list, sometimes emoji
  const e1 = Array.isArray(first.emoji_list) ? first.emoji_list[0] : null;
  const e2 = typeof first.emoji === "string" ? first.emoji : null;
  return e1 || e2 || null;
}

async function uploadStickerAndGetFileId(
  ctx: Context,
  userId: number,
  filePath: string
): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`uploadStickerAndGetFileId: file does not exist: ${filePath}`);
  }

  const fileSize = fs.statSync(filePath).size;
  console.log('uploadStickerAndGetFileId: Uploading sticker file:', {
    filePath,
    fileSize,
    fileSizeKB: Math.round(fileSize / 1024),
    userId,
  });

  const res = await (ctx as any).telegram.callApi("uploadStickerFile", {
    user_id: userId,
    sticker: { source: fs.createReadStream(filePath) }, // top-level -> multipart works
    sticker_format: "video",
  });

  // Telegram returns { file_id, file_unique_id, file_size? }
  const fileId = res?.file_id;
  if (!fileId) {
    throw new Error(`uploadStickerAndGetFileId: missing file_id in response: ${JSON.stringify(res)}`);
  }

  console.log('uploadStickerAndGetFileId: Successfully uploaded, file_id:', fileId);
  return fileId;
}

export async function createStickerSet(
  ctx: Context,
  title: string,
  shortName: string,
  firstStickerPath: string,
  emoji: string
): Promise<boolean> {
  try {
    // Debug guard: verify file exists
    if (!fs.existsSync(firstStickerPath)) {
      console.error('createStickerSet: File does not exist:', firstStickerPath);
      return false;
    }

    const userId = (ctx as any).from?.id;
    if (!userId) {
      throw new Error("createStickerSet: ctx.from.id missing");
    }

    console.log('createStickerSet: Creating sticker set with:', {
      title,
      shortName,
      emoji,
      filePath: firstStickerPath,
      fileExists: true,
      fileSize: fs.statSync(firstStickerPath).size,
      userId,
    });

    // 1) Upload file to Telegram -> get file_id (string)
    const firstStickerFileId = await uploadStickerAndGetFileId(ctx, userId, firstStickerPath);

    // 2) Create set using STRING file_id
    await (ctx as any).telegram.callApi("createNewStickerSet", {
      user_id: userId,
      name: shortName,
      title,
      sticker_format: "video",
      stickers: [
        {
          sticker: firstStickerFileId, // MUST be string in JSON mode
          emoji_list: [emoji],
        },
      ],
    });

    console.log('createStickerSet: Successfully created sticker set:', shortName);
    return true;
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] createStickerSet: Failed to create sticker set`);
    console.error(`[${errorTimestamp}] Error type:`, error.constructor.name);
    console.error(`[${errorTimestamp}] Error message:`, error.message);
    console.error(`[${errorTimestamp}] Error code:`, error.code);
    console.error(`[${errorTimestamp}] Error details:`, {
      title,
      shortName,
      emoji,
      filePath: firstStickerPath,
      fileExists: fs.existsSync(firstStickerPath),
      fileSize: fs.existsSync(firstStickerPath) ? fs.statSync(firstStickerPath).size : 0,
    });
    
    if (error.response) {
      console.error(`[${errorTimestamp}] Telegram API error response:`, JSON.stringify(error.response, null, 2));
      console.error(`[${errorTimestamp}] Telegram API error description:`, error.response.description);
      console.error(`[${errorTimestamp}] Telegram API error code:`, error.response.error_code);
    }
    
    if (error.stack) {
      console.error(`[${errorTimestamp}] Error stack:`, error.stack);
    }
    
    return false;
  }
}

export async function addStickerToSet(
  ctx: Context,
  shortName: string,
  stickerPath: string,
  emoji: string
): Promise<boolean> {
  try {
    // Debug guard: verify file exists
    if (!fs.existsSync(stickerPath)) {
      console.error('addStickerToSet: File does not exist:', stickerPath);
      return false;
    }

    const userId = (ctx as any).from?.id;
    if (!userId) {
      throw new Error("addStickerToSet: ctx.from.id missing");
    }

    console.log('addStickerToSet: Adding sticker to set:', {
      shortName,
      emoji,
      filePath: stickerPath,
      fileExists: true,
      fileSize: fs.statSync(stickerPath).size,
    });

    // upload -> file_id
    const stickerFileId = await uploadStickerAndGetFileId(ctx, userId, stickerPath);

    // add using file_id string
    await (ctx as any).telegram.callApi("addStickerToSet", {
      user_id: userId,
      name: shortName,
      sticker: {
        sticker: stickerFileId, // string
        emoji_list: [emoji],
      },
    });

    console.log('addStickerToSet: Successfully added sticker to set:', shortName);
    return true;
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] addStickerToSet: Failed to add sticker to set`);
    console.error(`[${errorTimestamp}] Error type:`, error.constructor.name);
    console.error(`[${errorTimestamp}] Error message:`, error.message);
    console.error(`[${errorTimestamp}] Error details:`, {
      shortName,
      emoji,
      filePath: stickerPath,
      fileExists: fs.existsSync(stickerPath),
      fileSize: fs.existsSync(stickerPath) ? fs.statSync(stickerPath).size : 0,
    });
    if (error.response) {
      console.error(`[${errorTimestamp}] Telegram API error response:`, JSON.stringify(error.response, null, 2));
      console.error(`[${errorTimestamp}] Telegram API error description:`, error.response.description);
      console.error(`[${errorTimestamp}] Telegram API error code:`, error.response.error_code);
    }
    if (error.stack) {
      console.error(`[${errorTimestamp}] Error stack:`, error.stack);
    }
    return false;
  }
}

export async function getStickerSetEmoji(ctx: Context, setName: string): Promise<string | null> {
  try {
    // Resolve pack name (auto-append _by_<bot> if needed)
    const resolvedName = resolveStickerSetName(setName);
    console.log(`[${new Date().toISOString()}] [Packs] Resolving pack name: "${setName}" -> "${resolvedName}"`);

    // Get sticker set info from Telegram
    const result = await (ctx as any).telegram.callApi("getStickerSet", {
      name: resolvedName,
    });

    // Extract emoji using helper function
    return extractStickerSetEmoji(result);
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] getStickerSetEmoji: Failed to get sticker set "${setName}":`, error.message);
    return null;
  }
}

export async function getMyStickerSets(ctx: Context): Promise<string[]> {
  // Telegram Bot API doesn't provide a way to list sticker sets created by a bot
  // Users must manually enter the pack name when adding to existing pack
  return [];
}
