import { Context } from 'telegraf';
import { env } from '../env';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

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

    // Use raw Telegram Bot API with form-data for video stickers
    // Telegraf's createNewStickerSet doesn't handle video stickers properly
    const form = new FormData();
    form.append('user_id', ctx.from!.id.toString());
    form.append('name', shortName);
    form.append('title', title);
    form.append('sticker', fs.createReadStream(firstStickerPath), {
      filename: 'sticker.webm',
      contentType: 'video/webm'
    });
    form.append('emoji', emoji);
    form.append('sticker_type', 'video');

    const response = await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createNewStickerSet`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.description || 'Failed to create sticker set');
    }

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
    
    // Use raw Telegram Bot API with form-data for video stickers
    const form = new FormData();
    form.append('user_id', ctx.from!.id.toString());
    form.append('name', setName);
    form.append('sticker', fs.createReadStream(stickerPath), {
      filename: 'sticker.webm',
      contentType: 'video/webm'
    });
    form.append('emoji', emoji);
    form.append('sticker_type', 'video');

    const response = await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/addStickerToSet`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.description || 'Failed to add sticker to set');
    }

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

