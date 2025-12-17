import { Telegraf } from 'telegraf';
import { env } from './env';
import { REPLY_OPTIONS } from './telegram/menus';
import { runCommand, CommandKey } from './telegram/router';
import { setupBatchConvertFlow, handlePackTitle, handlePackEmoji, handleExistingPackName } from './telegram/flows_batch';
import { setupSingleConvertFlow } from './telegram/flows_convert';
import { setupAIFlows, handleProjectContext, handleTemplate } from './telegram/flows_ai';
import { getSession, setSession } from './telegram/sessions';
import { startJobProcessor, stopJobProcessor } from './services/jobProcessor';

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

// Enable Telegraf debug logging if in development
if (process.env.NODE_ENV !== 'production') {
  process.env.DEBUG = 'telegraf:*';
}

// Log unhandled errors
process.on('unhandledRejection', (error) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [UnhandledRejection]`, error);
});

process.on('uncaughtException', (error) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [UncaughtException]`, error);
  process.exit(1);
});

// Start command - uses router
bot.start(async (ctx) => {
  await runCommand(ctx, 'start');
});

// Slash commands - all use the same router
bot.command('batch', async (ctx) => {
  await runCommand(ctx, 'batch');
});

bot.command('convert', async (ctx) => {
  await runCommand(ctx, 'convert');
});

bot.command('ai', async (ctx) => {
  await runCommand(ctx, 'ai');
});

bot.command('pack', async (ctx) => {
  await runCommand(ctx, 'pack');
});

bot.command('done', async (ctx) => {
  await runCommand(ctx, 'done');
});

bot.command('help', async (ctx) => {
  await runCommand(ctx, 'help');
});

bot.command('mypacks', async (ctx) => {
  await runCommand(ctx, 'mypacks');
});

// Inline keyboard button callbacks - trigger same commands
bot.action(/^cmd:(.+)$/, async (ctx) => {
  const key = ctx.match[1] as CommandKey;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Button] User ${ctx.from!.id} clicked button: cmd:${key}`);
  
  // Acknowledge the callback to remove loading spinner
  await ctx.answerCbQuery();
  
  // Optionally remove buttons from the clicked message to reduce clutter
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch (error) {
    // Ignore errors if message can't be edited (e.g., already edited)
  }
  
  // Execute the command using the same router
  await runCommand(ctx, key);
});

// Setup file upload handlers
setupBatchConvertFlow(bot);
setupSingleConvertFlow(bot);
setupAIFlows(bot);

// Handle text messages for various flows
bot.on('text', async (ctx) => {
  const session = getSession(ctx.from!.id);
  const text = ctx.message.text.trim();
  const textLower = text.toLowerCase();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Text Handler] User ${ctx.from!.id} sent text: "${text}", mode: ${session.mode}`);

  // Skip if it's a command (commands are handled separately)
  if (text.startsWith('/')) {
    return;
  }

  // Handle "new" or "existing <pack_name>" for batch pack creation
  if (session.mode === 'batch' && session.uploadedFiles.length > 0 && !session.chosenPackAction) {
    if (textLower === 'new') {
      console.log(`[${timestamp}] [Text Handler] User chose to create new pack`);
      setSession(ctx.from!.id, { chosenPackAction: 'new' });
      await ctx.reply('What should the pack title be?', REPLY_OPTIONS);
      return;
    } else if (textLower.startsWith('existing ')) {
      const packName = text.substring(9).trim();
      console.log(`[${timestamp}] [Text Handler] User chose to add to existing pack: ${packName}`);
      setSession(ctx.from!.id, { chosenPackAction: 'existing', existingPackName: packName });
      await ctx.reply('Choose one emoji to apply to all stickers:', REPLY_OPTIONS);
      return;
    }
  }

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

  // Existing pack name handling (if user types pack name directly)
  if (session.mode === 'batch' && session.chosenPackAction === 'existing' && !session.existingPackName) {
    await handleExistingPackName(ctx, text);
    return;
  }

  // AI pack size handling (6 or 12)
  if (session.mode === 'pack' && !session.packSize && (textLower === '6' || textLower === '12')) {
    const size = parseInt(textLower);
    console.log(`[${timestamp}] [Text Handler] User chose pack size: ${size}`);
    setSession(ctx.from!.id, { packSize: size });
    await ctx.reply('Choose a theme: Reply with "degen", "wholesome", or "builder"', REPLY_OPTIONS);
    return;
  }

  // AI pack theme handling
  if (session.mode === 'pack' && session.packSize && !session.theme && (textLower === 'degen' || textLower === 'wholesome' || textLower === 'builder')) {
    console.log(`[${timestamp}] [Text Handler] User chose theme: ${textLower}`);
    setSession(ctx.from!.id, { theme: textLower });
    await ctx.reply('Send a base image for the pack (PNG preferred).', REPLY_OPTIONS);
    return;
  }

  // Project context handling
  if (session.mode === 'ai' && session.uploadedFiles.length > 0 && !session.projectContext && !session.chosenTemplate) {
    await handleProjectContext(ctx, text);
    return;
  }

  // Template handling (from text)
  if (session.mode === 'ai' && session.projectContext !== undefined && !session.chosenTemplate) {
    await handleTemplate(ctx, text);
    return;
  }

  // AI pack title handling
  if (session.mode === 'pack' && session.uploadedFiles.length > 0 && !session.packTitle) {
    setSession(ctx.from!.id, { packTitle: text });
    await ctx.reply('Choose one emoji to apply to all stickers:', REPLY_OPTIONS);
    return;
  }

  // AI pack emoji handling
  if (session.mode === 'pack' && session.packTitle && !session.emoji) {
    await handlePackEmoji(ctx, text);
    return;
  }
});

// Error handling with detailed logging
bot.catch((err, ctx) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Bot Error] Error for ${ctx.updateType}:`, err);
  if (err instanceof Error) {
    console.error(`[${timestamp}] [Bot Error] Error message:`, err.message);
    console.error(`[${timestamp}] [Bot Error] Error stack:`, err.stack);
    if (err.message && err.message.includes('timeout')) {
      console.error(`[${timestamp}] [Bot Error] Timeout error - operation took too long.`);
    }
  }
});

// Register bot commands with Telegram
async function registerCommands() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the bot and see main menu' },
      { command: 'batch', description: 'Start batch conversion (up to 10 files)' },
      { command: 'convert', description: 'Convert a single file to sticker' },
      { command: 'ai', description: 'AI Sticker Maker - create animated sticker' },
      { command: 'pack', description: 'AI Generate Pack - create pack with AI' },
      { command: 'done', description: 'Finish batch and create pack' },
      { command: 'help', description: 'Show help information' },
    ]);
    console.log('[Bot] Commands registered successfully with Telegram');
  } catch (error) {
    console.error('[Bot] Failed to register commands:', error);
  }
}

// Start bot
bot.launch().then(async () => {
  console.log('[Bot] ========================================');
  console.log('[Bot] PackPuter bot is running!');
  console.log('[Bot] ========================================');
  
  // Register commands
  await registerCommands();
  
  // Start job processor for async operations
  startJobProcessor(bot);
  console.log('[Bot] Job processor started');
  
  console.log('[Bot] Bot is ready to receive messages');
}).catch((error) => {
  console.error('[Bot] FATAL: Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('[Bot] Received SIGINT, shutting down gracefully...');
  stopJobProcessor();
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('[Bot] Received SIGTERM, shutting down gracefully...');
  stopJobProcessor();
  bot.stop('SIGTERM');
});
