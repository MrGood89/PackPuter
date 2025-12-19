import { Telegraf } from 'telegraf';
import { env } from './env';
import { REMOVE_KEYBOARD, FORCE_REPLY } from './telegram/menus';
import { mainMenuKeyboard } from './telegram/menu';
import { runCommand, CommandKey } from './telegram/router';
import { setupBatchConvertFlow, handlePackTitle, handlePackEmoji, handleExistingPackName } from './telegram/flows_batch';
import { setupAIFlows, handleProjectContext, handleTemplate } from './telegram/flows_ai';
import { setupAIImageFlow, handleAIImageContext, handleAIImageTemplate } from './telegram/flows_ai_image';
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

// Start command - redirect to pack (Memeputer uses /start by default)
bot.start(async (ctx) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Start] /start command received from user ${ctx.from!.id} - redirecting to /pack`);
  await runCommand(ctx, 'pack');
});

// Pack command - our main start command
bot.command('pack', async (ctx) => {
  await runCommand(ctx, 'pack');
});

// Slash commands - all use the same router
bot.command('batch', async (ctx) => {
  await runCommand(ctx, 'batch');
});

bot.command('ai', async (ctx) => {
  await runCommand(ctx, 'ai');
});

bot.command('ai_image', async (ctx) => {
  await runCommand(ctx, 'ai_image');
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
  let key = ctx.match[1] as CommandKey;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Button] User ${ctx.from!.id} clicked button: cmd:${key}`);
  
  
  // Acknowledge the callback to remove loading spinner
  await ctx.answerCbQuery();
  
  // Remove buttons from the clicked message to reduce clutter
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch (error) {
    // Ignore errors if message can't be edited (e.g., already edited)
    console.log(`[${timestamp}] [Button] Could not remove inline keyboard (non-critical):`, error);
  }
  
  // CRITICAL: Also remove any ReplyKeyboard that might be showing
  // Use a minimal non-empty message to avoid Telegram error
  try {
    await ctx.reply('Clearing...', REMOVE_KEYBOARD);
  } catch (error) {
    // Ignore - keyboard might not exist
  }
  
  // Execute the command using the same router
  await runCommand(ctx, key);
});

// Emoji picker pagination
bot.action(/^emoji_page:(\d+)$/, async (ctx) => {
  const page = Number(ctx.match[1] || 0);
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Emoji Picker] User ${ctx.from!.id} navigating to page ${page}`);
  
  const session = getSession(ctx.from!.id);
  setSession(ctx.from!.id, { emojiPickPage: page });
  
  await ctx.answerCbQuery();
  
  const { emojiPickerKeyboard } = await import('./telegram/ui');
  await ctx.editMessageText(
    'Choose an emoji for this pack (tap one):',
    emojiPickerKeyboard(page)
  );
});

// Image sticker mode selection
bot.action(/^img_mode:(.+)$/, async (ctx) => {
  const mode = ctx.match[1] as 'custom' | 'auto';
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Image Sticker Mode] User ${ctx.from!.id} selected mode: ${mode}`);
  
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai_image') return;
  
  await ctx.answerCbQuery();
  
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch (error) {
    // Ignore
  }
  
  setSession(ctx.from!.id, { imageStickerMode: mode });
  
  if (mode === 'custom') {
    await ctx.reply(
      '🎨 **Custom Sticker Mode**\n\n' +
      'Describe what you want the sticker to show. For example:\n' +
      '• "Character holding a sign saying HODL"\n' +
      '• "Character celebrating with confetti"\n' +
      '• "Character looking disappointed"\n\n' +
      'I\'ll generate one sticker based on your description.',
      FORCE_REPLY
    );
  } else {
    // Auto-generated mode: generate common crypto stickers
    await ctx.reply('📦 **Auto-Generated Set Mode**\n\nGenerating common crypto stickers (GM, GN, LFG, HIGHER, HODL, WAGMI, NGMI, SER, REKT, ALPHA)...');
    
    // Start generation immediately
    setImmediate(async () => {
      const { generateAutoStickerSet } = await import('./telegram/flows_ai_image');
      await generateAutoStickerSet(ctx);
    });
  }
});

// Emoji selection
bot.action(/^emoji_pick:(.+)$/, async (ctx) => {
  const emoji = ctx.match[1]; // Don't decode - emoji should be passed as-is
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Emoji Picker] User ${ctx.from!.id} selected emoji: ${emoji}`);
  
  const session = getSession(ctx.from!.id);
  
  // Validate emoji (basic check - should be single emoji, allow up to 4 chars for complex emojis)
  if (!emoji || emoji.length > 4) {
    await ctx.answerCbQuery('Invalid emoji selected', { show_alert: true });
    return;
  }
  
  // Store emoji and continue pack creation
  setSession(ctx.from!.id, { 
    emoji, 
    awaitingEmojiPick: false 
  });
  
  await ctx.answerCbQuery(`Selected ${emoji}`);
  
  // Update message to show selection
  try {
    await ctx.editMessageText(`✅ Emoji set to ${emoji}. Creating pack...`);
  } catch (error) {
    // Message might already be edited, continue anyway
    console.log(`[${timestamp}] [Emoji Picker] Could not edit message (non-critical):`, error);
  }
  
  // Continue pack creation flow
  await handlePackEmoji(ctx, emoji);
});

// Setup file upload handlers
setupBatchConvertFlow(bot);
setupAIFlows(bot);
setupAIImageFlow(bot);

// Debug: Log all message updates to see what we're receiving
bot.use(async (ctx, next) => {
  const timestamp = new Date().toISOString();
  if (ctx.updateType === 'message' && ctx.message) {
    const hasPhoto = 'photo' in ctx.message && ctx.message.photo;
    const hasDocument = 'document' in ctx.message && ctx.message.document;
    if (hasPhoto || hasDocument) {
      console.log(`[${timestamp}] [Debug Middleware] Received message with photo=${!!hasPhoto}, document=${!!hasDocument}, userId: ${ctx.from?.id}`);
      const session = getSession(ctx.from!.id);
      console.log(`[${timestamp}] [Debug Middleware] Session mode: ${session.mode}`);
      if (hasPhoto) {
        console.log(`[${timestamp}] [Debug Middleware] Photo array length: ${ctx.message.photo?.length || 0}`);
      }
      if (hasDocument) {
        console.log(`[${timestamp}] [Debug Middleware] Document mimeType: ${ctx.message.document?.mime_type}`);
      }
    }
  }
  return next();
});

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
  // Also handle AI-generated stickers (they switch to batch mode after generation)
  if ((session.mode === 'batch' || session.mode === 'ai' || session.mode === 'ai_image') && session.uploadedFiles.length > 0 && !session.chosenPackAction) {
    if (textLower === 'new') {
      console.log(`[${timestamp}] [Text Handler] User chose to create new pack`);
      // Ensure we're in batch mode for pack creation
      if (session.mode === 'ai') {
        setSession(ctx.from!.id, { mode: 'batch', chosenPackAction: 'new' });
      } else {
        setSession(ctx.from!.id, { chosenPackAction: 'new' });
      }
      await ctx.reply('What should the pack title be?', FORCE_REPLY);
      return;
    } else if (textLower.startsWith('existing ')) {
      const packName = text.substring(9).trim();
      console.log(`[${timestamp}] [Text Handler] User chose to add to existing pack: ${packName}`);
      // Ensure we're in batch mode for pack creation
      if (session.mode === 'ai') {
        setSession(ctx.from!.id, { mode: 'batch', chosenPackAction: 'existing' });
      } else {
        setSession(ctx.from!.id, { chosenPackAction: 'existing' });
      }
      // handleExistingPackName will fetch emoji from pack and proceed
      await handleExistingPackName(ctx, packName);
      return;
    }
  }

  // Pack title handling
  if (session.mode === 'batch' && session.chosenPackAction === 'new' && !session.packTitle) {
    await handlePackTitle(ctx, text);
    return;
  }

  // Pack emoji handling (only for new packs) - skip if using emoji picker
  if (session.mode === 'batch' && session.chosenPackAction === 'new' && session.packTitle && !session.emoji && !session.awaitingEmojiPick) {
    // Fallback: allow typed emoji if user types one anyway
    await handlePackEmoji(ctx, text);
    return;
  }

  // Existing pack name handling (if user types pack name directly after "existing")
  // This should only trigger if we haven't resolved the pack name yet
  if (session.mode === 'batch' && session.chosenPackAction === 'existing' && !session.existingPackName) {
    await handleExistingPackName(ctx, text);
    return;
  }

  // DO NOT treat text as emoji if we're waiting for pack name resolution
  // Only accept emoji if we explicitly asked for it (which shouldn't happen for existing packs anymore)

  // AI pack size handling (6 or 12)
  if (session.mode === 'pack' && !session.packSize && (textLower === '6' || textLower === '12')) {
    const size = parseInt(textLower);
    console.log(`[${timestamp}] [Text Handler] User chose pack size: ${size}`);
    setSession(ctx.from!.id, { packSize: size });
    await ctx.reply('Choose a theme: Reply with "degen", "wholesome", or "builder"', FORCE_REPLY);
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

  // Template handling (from text) - AI Video Sticker Maker
  if (session.mode === 'ai' && session.projectContext !== undefined && !session.chosenTemplate) {
    await handleTemplate(ctx, text);
    return;
  }

  // AI Image Sticker Maker - project context handling
  if (session.mode === 'ai_image' && session.uploadedFiles.length > 0 && session.projectContext === undefined) {
    await handleAIImageContext(ctx, text);
    return;
  }

  // AI Image Sticker Maker - custom instructions handling
  if (session.mode === 'ai_image' && session.imageStickerMode === 'custom' && !session.customInstructions) {
    const { handleCustomStickerInstructions } = await import('./telegram/flows_ai_image');
    await handleCustomStickerInstructions(ctx, text);
    return;
  }

  // AI Image Sticker Maker - template handling (legacy)
  if (session.mode === 'ai_image' && session.projectContext !== undefined && !session.chosenTemplate && !session.imageStickerMode) {
    await handleAIImageTemplate(ctx, text);
    return;
  }

  // AI pack title handling
  if (session.mode === 'pack' && session.uploadedFiles.length > 0 && !session.packTitle) {
    setSession(ctx.from!.id, { packTitle: text, awaitingEmojiPick: true, emojiPickPage: 0 });
    const { emojiPickerKeyboard } = await import('./telegram/ui');
    await ctx.reply('Choose an emoji for this pack (tap one):', emojiPickerKeyboard(0));
    return;
  }

  // AI pack emoji handling - skip if using emoji picker
  if (session.mode === 'pack' && session.packTitle && !session.emoji && !session.awaitingEmojiPick) {
    // Fallback: allow typed emoji if user types one anyway
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
      { command: 'pack', description: 'Start the bot and see main menu' },
      { command: 'batch', description: 'Start batch conversion (up to 10 files)' },
      { command: 'ai', description: 'AI Video Sticker Maker - create animated sticker' },
      { command: 'ai_image', description: 'AI Image Sticker Maker - create static PNG stickers' },
      { command: 'generate', description: 'AI Generate Pack - create pack with AI' },
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
