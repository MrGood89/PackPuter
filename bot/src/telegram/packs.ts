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
    // Get sticker set info from Telegram
    const result = await (ctx as any).telegram.callApi("getStickerSet", {
      name: setName,
    });

    // Extract emoji from the first sticker in the set
    // Stickers array contains objects with emoji_list
    if (result?.stickers && Array.isArray(result.stickers) && result.stickers.length > 0) {
      const firstSticker = result.stickers[0];
      if (firstSticker?.emoji_list && Array.isArray(firstSticker.emoji_list) && firstSticker.emoji_list.length > 0) {
        // Return the first emoji from the first sticker
        return firstSticker.emoji_list[0];
      }
    }

    return null;
  } catch (error: any) {
    console.error('getStickerSetEmoji: Failed to get sticker set:', error.message);
    return null;
  }
}

export async function getMyStickerSets(ctx: Context): Promise<string[]> {
  // Telegram Bot API doesn't provide a way to list sticker sets created by a bot
  // Users must manually enter the pack name when adding to existing pack
  return [];
}
