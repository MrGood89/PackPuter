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
  const bot = env.BOT_USERNAME.toLowerCase(); // MUST be lowercase
  return `${base}_by_${bot}`;
}

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}

function inputFileFromPath(filePath: string) {
  return { source: fs.createReadStream(filePath) };
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

    const fileSize = fs.statSync(firstStickerPath).size;
    console.log('createStickerSet: Creating sticker set with:', {
      title,
      shortName,
      emoji,
      filePath: firstStickerPath,
      fileExists: true,
      fileSize,
      fileSizeKB: Math.round(fileSize / 1024),
    });

    const userId = (ctx as any).from?.id;
    if (!userId) {
      throw new Error("createStickerSet: ctx.from.id missing");
    }

    const payload = {
      user_id: userId,
      name: shortName,
      title,
      sticker_format: "video",
      stickers: [
        {
          sticker: inputFileFromPath(firstStickerPath),
          emoji_list: [emoji],
        },
      ],
    };

    await (ctx as any).telegram.callApi("createNewStickerSet", payload);
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

    const fileSize = fs.statSync(stickerPath).size;
    console.log('addStickerToSet: Adding sticker to set:', {
      shortName,
      emoji,
      filePath: stickerPath,
      fileExists: true,
      fileSize,
      fileSizeKB: Math.round(fileSize / 1024),
    });

    const userId = (ctx as any).from?.id;
    if (!userId) {
      throw new Error("addStickerToSet: ctx.from.id missing");
    }

    const payload = {
      user_id: userId,
      name: shortName,
      sticker: {
        sticker: inputFileFromPath(stickerPath),
        emoji_list: [emoji],
      },
    };

    await (ctx as any).telegram.callApi("addStickerToSet", payload);
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

export async function getMyStickerSets(ctx: Context): Promise<string[]> {
  // Telegram Bot API doesn't provide a way to list sticker sets created by a bot
  // Users must manually enter the pack name when adding to existing pack
  return [];
}
