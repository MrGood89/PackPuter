import { Markup } from 'telegraf';
import { env } from '../env';

// Remove keyboard helper - use this to remove any existing keyboards
export const removeKeyboard = Markup.removeKeyboard();

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}

