import { Markup } from 'telegraf';

/**
 * Main menu with inline keyboard buttons
 * These buttons trigger command flows via callback queries
 */
export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🧰 Batch Convert (≤10 per batch)', 'cmd:batch')
    ],
    [
      Markup.button.callback('✨ AI Video Sticker', 'cmd:ai'),
      Markup.button.callback('🖼️ AI Image Sticker', 'cmd:ai_image')
    ],
    [
      Markup.button.callback('🔥 AI Generate Pack', 'cmd:generate')
    ],
    [
      Markup.button.callback('📦 My Packs', 'cmd:mypacks'),
      Markup.button.callback('❓ Help', 'cmd:help')
    ],
  ]);
}

// Also export a callback handler for pack! button (same as start)
export const PACK_START_CALLBACK = 'cmd:pack!';

