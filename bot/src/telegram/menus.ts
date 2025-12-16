import { Markup } from 'telegraf';
import { env } from '../env';

// Remove keyboard helper - use this to remove any existing keyboards
export const removeKeyboard = Markup.removeKeyboard();

// Helper to ensure all replies remove keyboards
// Use Telegraf's Markup.removeKeyboard() which returns the correct type
export const REPLY_OPTIONS = Markup.removeKeyboard();

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}

