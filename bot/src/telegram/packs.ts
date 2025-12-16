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
    const sticker = {
      source: fs.createReadStream(firstStickerPath) as unknown as InputFile,
    };

    await (ctx.telegram as any).createNewStickerSet(
      ctx.from!.id,
      shortName,
      title,
      sticker,
      emoji,
      { sticker_type: 'video' }
    );

    return true;
  } catch (error: any) {
    console.error('Failed to create sticker set:', error);
    console.error('Error details:', {
      title,
      shortName,
      emoji,
      filePath: firstStickerPath,
      fileExists: fs.existsSync(firstStickerPath),
      errorMessage: error.message,
      errorCode: error.code,
    });
    if (error.response) {
      console.error('Telegram API error response:', JSON.stringify(error.response, null, 2));
      console.error('Telegram API error description:', error.response.description);
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
    const sticker = {
      source: fs.createReadStream(stickerPath) as unknown as InputFile,
    };

    await (ctx.telegram as any).addStickerToSet(
      ctx.from!.id,
      setName,
      sticker,
      emoji,
      { sticker_type: 'video' }
    );

    return true;
  } catch (error: any) {
    console.error('Failed to add sticker to set:', error);
    console.error('Error details:', {
      setName,
      emoji,
      filePath: stickerPath,
      fileExists: fs.existsSync(stickerPath),
      errorMessage: error.message,
      errorCode: error.code,
    });
    if (error.response) {
      console.error('Telegram API error response:', JSON.stringify(error.response, null, 2));
      console.error('Telegram API error description:', error.response.description);
    }
    return false;
  }
}

export async function getMyStickerSets(ctx: Context): Promise<string[]> {
  try {
    const sets = await ctx.telegram.getStickerSet(''); // This won't work, need alternative
    // For MVP, return empty array - user will need to manually enter pack name
    return [];
  } catch (error) {
    console.error('Failed to get sticker sets:', error);
    return [];
  }
}

