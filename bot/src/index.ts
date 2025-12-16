import { Telegraf } from 'telegraf';
import { env } from './env';
import { setupBatchConvertFlow, handlePackTitle, handlePackEmoji, handleExistingPackName } from './telegram/flows_batch';
import { setupSingleConvertFlow } from './telegram/flows_convert';
import { setupAIFlows, handleProjectContext, handleTemplate } from './telegram/flows_ai';
import { getSession, setSession } from './telegram/sessions';
import { startJobProcessor, stopJobProcessor } from './services/jobProcessor';

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

// Start command
bot.start(async (ctx) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Start] /start command received from user ${ctx.from!.id}`);
  
  await ctx.reply(
    `Welcome to PackPuter! 🎨\n\n` +
    `Commands:\n` +
    `/batch - Convert up to 10 files and create a pack\n` +
    `/convert - Convert a single file to sticker\n` +
    `/ai - AI Sticker Maker\n` +
    `/pack - AI Generate Pack (6 or 12 stickers)\n` +
    `/done - Finish batch and create pack\n` +
    `/help - Show help\n\n` +
    `Type a command to get started!`,
    { reply_markup: { remove_keyboard: true } }
  );
});

// Help command
bot.command('help', async (ctx) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Help] /help command received from user ${ctx.from!.id}`);
  
  await ctx.reply(
    `PackPuter Help 📖\n\n` +
    `Commands:\n` +
    `/batch - Upload up to 10 GIFs/videos, convert them all, and create a pack\n` +
    `/convert - Convert one file to a sticker\n` +
    `/ai - AI Sticker Maker: Send a base image, choose a template\n` +
    `/pack - AI Generate Pack: Generate a full sticker pack (6 or 12 stickers)\n` +
    `/done - Finish batch and proceed to pack creation\n\n` +
    `All stickers meet Telegram requirements:\n` +
    `• WEBM VP9 format\n` +
    `• ≤ 3 seconds\n` +
    `• ≤ 30 fps\n` +
    `• 512px max dimension\n` +
    `• ≤ 256 KB`,
    { reply_markup: { remove_keyboard: true } }
  );
});

// Setup flows
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
      await ctx.reply('What should the pack title be?');
      return;
    } else if (textLower.startsWith('existing ')) {
      const packName = text.substring(9).trim();
      console.log(`[${timestamp}] [Text Handler] User chose to add to existing pack: ${packName}`);
      setSession(ctx.from!.id, { chosenPackAction: 'existing', existingPackName: packName });
      await ctx.reply('Choose one emoji to apply to all stickers:');
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
    await ctx.reply('Choose a theme: Reply with "degen", "wholesome", or "builder"');
    return;
  }

  // AI pack theme handling
  if (session.mode === 'pack' && session.packSize && !session.theme && (textLower === 'degen' || textLower === 'wholesome' || textLower === 'builder')) {
    console.log(`[${timestamp}] [Text Handler] User chose theme: ${textLower}`);
    setSession(ctx.from!.id, { theme: textLower });
    await ctx.reply('Send a base image for the pack (PNG preferred).');
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
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error for ${ctx.updateType}:`, err);
  if (err instanceof Error && err.message && err.message.includes('timeout')) {
    console.error(`[${timestamp}] Timeout error - operation took too long. Consider making operations non-blocking.`);
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
    console.log('Bot commands registered successfully');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}

// Start bot
bot.launch().then(async () => {
  console.log('PackPuter bot is running!');
  // Register commands
  await registerCommands();
  // Start job processor for async operations
  startJobProcessor(bot);
  console.log('Job processor started');
}).catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  stopJobProcessor();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  stopJobProcessor();
  bot.stop('SIGTERM');
});
