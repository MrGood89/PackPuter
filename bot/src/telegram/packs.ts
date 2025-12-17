import { Context } from 'telegraf';
import { InputFile } from 'telegraf/typings/core/types/typegram';
import { env } from '../env';
import fs from 'fs';

export async function createStickerSet(
  ctx: Context,
  title: string,
  shortName: string,
  firstStickerPath: string,
  emoji: string
): Promise<boolean> {
  try {
    // Verify file exists and get size
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
      fileSize,
      fileSizeKB: Math.round(fileSize / 1024),
      userId: ctx.from!.id
    });

    // Use the correct Telegram Bot API format for createNewStickerSet
    // Telegraf signature: createNewStickerSet(userId, name, title, sticker, emoji, extra?)
    // For video stickers, we need to pass sticker_type in the extra options
    const sticker = fs.createReadStream(firstStickerPath);
    
    // TypeScript definitions don't include sticker_type, so we use type assertion
    await (ctx.telegram as any).createNewStickerSet(
      ctx.from!.id,
      shortName,
      title,
      sticker,
      emoji,
      { sticker_type: 'video' }
    );

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
      userId: ctx.from!.id,
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
  setName: string,
  stickerPath: string,
  emoji: string
): Promise<boolean> {
  try {
    // Verify file exists
    if (!fs.existsSync(stickerPath)) {
      console.error('addStickerToSet: File does not exist:', stickerPath);
      return false;
    }
    
    const sticker = fs.createReadStream(stickerPath);

    // TypeScript definitions don't include sticker_type, so we use type assertion
    await (ctx.telegram as any).addStickerToSet(
      ctx.from!.id,
      setName,
      sticker,
      emoji,
      { sticker_type: 'video' }
    );

    return true;
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] addStickerToSet: Failed to add sticker to set`);
    console.error(`[${errorTimestamp}] Error type:`, error.constructor.name);
    console.error(`[${errorTimestamp}] Error message:`, error.message);
    console.error(`[${errorTimestamp}] Error details:`, {
      setName,
      emoji,
      filePath: stickerPath,
      fileExists: fs.existsSync(stickerPath),
      fileSize: fs.existsSync(stickerPath) ? fs.statSync(stickerPath).size : 0,
      userId: ctx.from!.id,
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

