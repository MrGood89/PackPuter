// Keyboard removal and reply options
// NO ReplyKeyboard creation - only removal helpers

export const REMOVE_KEYBOARD = {
  reply_markup: { remove_keyboard: true }
};

export const FORCE_REPLY = {
  reply_markup: { force_reply: true }
};

// Standard reply options (no keyboard, disable web preview)
export const DEFAULT_REPLY_OPTS = {
  disable_web_page_preview: true
};

export function getAddStickerLink(shortName: string): string {
  return `https://t.me/addstickers/${shortName}`;
}
