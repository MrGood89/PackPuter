import { Markup } from 'telegraf';
import { env } from '../env';

// Remove keyboard helper - use this to remove any existing keyboards
export const removeKeyboard = Markup.removeKeyboard();

// Helper to ensure all replies remove keyboards
export const REPLY_OPTIONS = { reply_markup: { remove_keyboard: true } };

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}

