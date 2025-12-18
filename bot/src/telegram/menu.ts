import { Markup } from 'telegraf';

/**
 * Main menu with inline keyboard buttons
 * These buttons trigger command flows via callback queries
 */
export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🧰 Batch Convert (≤10)', 'cmd:batch')
    ],
    [
      Markup.button.callback('✨ AI Sticker Maker', 'cmd:ai'),
      Markup.button.callback('🔥 AI Generate Pack', 'cmd:pack')
    ],
    [
      Markup.button.callback('📦 My Packs', 'cmd:mypacks'),
      Markup.button.callback('❓ Help', 'cmd:help')
    ],
  ]);
}

