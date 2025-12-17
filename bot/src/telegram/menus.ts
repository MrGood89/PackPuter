import { Markup } from 'telegraf';

// Keyboard removal and reply options
// NO ReplyKeyboard creation - only removal helpers
// Use Telegraf's Markup helpers to get correct literal types

export const REMOVE_KEYBOARD = Markup.removeKeyboard();

export const FORCE_REPLY = Markup.forceReply();

// Standard reply options (no keyboard, disable web preview)
export const DEFAULT_REPLY_OPTS = {
  disable_web_page_preview: true
};
