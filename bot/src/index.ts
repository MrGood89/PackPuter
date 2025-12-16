import { Telegraf } from 'telegraf';
import { env } from './env';
import { mainMenu } from './telegram/menus';
import { setupBatchConvertFlow, handlePackTitle, handlePackEmoji, handleExistingPackName } from './telegram/flows_batch';
import { setupSingleConvertFlow } from './telegram/flows_convert';
import { setupAIFlows, handleProjectContext, handleTemplate } from './telegram/flows_ai';
import { getSession, setSession } from './telegram/sessions';

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

// Start command
bot.start(async (ctx) => {
  await ctx.reply(
    `Welcome to PackPuter! 🎨\n\n` +
    `I can help you:\n` +
    `• Convert GIFs/videos to Telegram stickers\n` +
    `• Generate AI-powered animated stickers\n` +
    `• Create sticker packs automatically\n\n` +
    `Choose an option from the menu:`,
    mainMenu
  );
});

// Help command
bot.hears('❓ Help', async (ctx) => {
  await ctx.reply(
    `PackPuter Help 📖\n\n` +
    `🧰 Batch Convert: Upload up to 10 GIFs/videos, convert them all, and create a pack.\n\n` +
    `🎞️ Single Convert: Convert one file to a sticker.\n\n` +
    `✨ AI Sticker Maker: Send a base image, choose a template, and get an AI-generated animated sticker.\n\n` +
    `🔥 AI Generate Pack: Generate a full sticker pack (6 or 12 stickers) with AI.\n\n` +
    `All stickers meet Telegram requirements:\n` +
    `• WEBM VP9 format\n` +
    `• ≤ 3 seconds\n` +
    `• ≤ 30 fps\n` +
    `• 512px max dimension\n` +
    `• ≤ 256 KB`,
    mainMenu
  );
});

// My Packs (placeholder for MVP)
bot.hears('📦 My Packs', async (ctx) => {
  await ctx.reply('This feature will be available soon!', mainMenu);
});

// Setup flows
setupBatchConvertFlow(bot);
setupSingleConvertFlow(bot);
setupAIFlows(bot);

// Handle text messages for various flows
bot.on('text', async (ctx) => {
  const session = getSession(ctx.from!.id);
  const text = ctx.message.text;

  // Pack title handling
  if (session.mode === 'batch' && session.chosenPackAction === 'new' && !session.packTitle) {
    await handlePackTitle(ctx, text);
    return;
  }

  // Pack emoji handling
  if (session.mode === 'batch' && session.packTitle && !session.emoji) {
    await handlePackEmoji(ctx, text);
    return;
  }

  // Existing pack name handling
  if (session.mode === 'batch' && session.chosenPackAction === 'existing' && !session.existingPackName) {
    await handleExistingPackName(ctx, text);
    return;
  }

  // Project context handling
  if (session.mode === 'ai' && session.uploadedFiles.length > 0 && !session.projectContext && !session.chosenTemplate) {
    await handleProjectContext(ctx, text);
    return;
  }

  // Template handling (from keyboard or text)
  if (session.mode === 'ai' && session.projectContext !== undefined && !session.chosenTemplate) {
    await handleTemplate(ctx, text);
    return;
  }

  // AI pack title handling
  if (session.mode === 'pack' && session.uploadedFiles.length > 0 && !session.packTitle) {
    setSession(ctx.from!.id, { packTitle: text });
    await ctx.reply('Choose one emoji to apply to all stickers:');
    return;
  }

  // AI pack emoji handling
  if (session.mode === 'pack' && session.packTitle && !session.emoji) {
    await handlePackEmoji(ctx, text);
    return;
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
bot.launch().then(() => {
  console.log('PackPuter bot is running!');
}).catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

