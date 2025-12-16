import { Markup } from 'telegraf';
import { env } from '../env';

export const mainMenu = Markup.keyboard([
  ['🧰 Batch Convert (≤10)', '🎞️ Single Convert'],
  ['✨ AI Sticker Maker', '🔥 AI Generate Pack'],
  ['📦 My Packs', '❓ Help'],
]).resize();

export const doneButton = Markup.keyboard([['✅ Done']]).resize();

export const packActionKeyboard = Markup.keyboard([
  ['📦 Create New Pack', '➕ Add to Existing'],
]).resize();

export const templateKeyboard = Markup.keyboard([
  ['GM', 'GN', 'LFG', 'HIGHER'],
  ['HODL', 'WAGMI', 'NGMI', 'SER'],
  ['REKT', 'ALPHA'],
]).resize();

export const packSizeKeyboard = Markup.keyboard([
  ['6 stickers', '12 stickers'],
]).resize();

export const themeKeyboard = Markup.keyboard([
  ['degen', 'wholesome', 'builder'],
]).resize();

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}

