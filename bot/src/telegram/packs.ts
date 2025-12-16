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

    await ctx.telegram.createNewStickerSet(
      ctx.from!.id,
      shortName,
      title,
      sticker,
      emoji,
      {
        sticker_type: 'video',
      }
    );

    return true;
  } catch (error: any) {
    console.error('Failed to create sticker set:', error);
    if (error.response) {
      console.error('Telegram API error:', error.response.description);
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

    await ctx.telegram.addStickerToSet(ctx.from!.id, setName, sticker, emoji, {
      sticker_type: 'video',
    });

    return true;
  } catch (error: any) {
    console.error('Failed to add sticker to set:', error);
    if (error.response) {
      console.error('Telegram API error:', error.response.description);
    }
    return false;
  }
}

export async function getMyStickerSets(ctx: Context): Promise<string[]> {
  try {
    const sets = await ctx.telegram.getMyStickerSets();
    return sets.sticker_sets
      .filter((set) => set.name.endsWith(`_by_${env.BOT_USERNAME}`))
      .map((set) => set.name)
      .slice(0, 5); // Last 5 packs
  } catch (error) {
    console.error('Failed to get sticker sets:', error);
    return [];
  }
}

