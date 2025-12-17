import { Context } from 'telegraf';
import { getSession, setSession, resetSession } from './sessions';
import { REPLY_OPTIONS } from './menus';

export type CommandKey = 'batch' | 'convert' | 'ai' | 'pack' | 'done' | 'help' | 'mypacks' | 'start';

/**
 * Central command router - handles both slash commands and button callbacks
 * This ensures buttons and commands behave identically
 */
export async function runCommand(ctx: Context, key: CommandKey): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Router] Executing command: ${key} for user ${ctx.from!.id}`);

  try {
    switch (key) {
      case 'start': {
        // Import here to avoid circular dependencies
        const { mainMenuKeyboard } = await import('./menu');
        // Remove any old reply keyboards
        await ctx.reply('Welcome to PackPuter! 🎨', REPLY_OPTIONS);
        await ctx.reply(
          'I can help you:\n' +
          '• Convert GIFs/videos to Telegram stickers\n' +
          '• Generate AI-powered animated stickers\n' +
          '• Create sticker packs automatically\n\n' +
          'Choose an option:',
          mainMenuKeyboard()
        );
        break;
      }

      case 'batch': {
        resetSession(ctx.from!.id);
        setSession(ctx.from!.id, { mode: 'batch' });
        await ctx.reply(
          'Send up to 10 GIFs/videos. I\'ll convert each into Telegram-ready stickers.\nWhen finished, use /done command.',
          REPLY_OPTIONS
        );
        break;
      }

      case 'convert': {
        resetSession(ctx.from!.id);
        setSession(ctx.from!.id, { mode: 'convert' });
        await ctx.reply(
          'Send a GIF or video file to convert to a Telegram sticker.',
          REPLY_OPTIONS
        );
        break;
      }

      case 'ai': {
        resetSession(ctx.from!.id);
        setSession(ctx.from!.id, { mode: 'ai' });
        await ctx.reply(
          'Send a base image (PNG preferred, JPG also accepted).',
          REPLY_OPTIONS
        );
        break;
      }

      case 'pack': {
        resetSession(ctx.from!.id);
        setSession(ctx.from!.id, { mode: 'pack' });
        await ctx.reply('How many stickers? Reply with "6" or "12"', REPLY_OPTIONS);
        break;
      }

      case 'done': {
        const session = getSession(ctx.from!.id);
        if (session.mode !== 'batch' || session.uploadedFiles.length === 0) {
          await ctx.reply('No files to process. Use /batch to start.', REPLY_OPTIONS);
          return;
        }

        // Verify all files still exist
        const fs = require('fs');
        const missingFiles = session.uploadedFiles.filter(f => !f.filePath || !fs.existsSync(f.filePath));
        if (missingFiles.length > 0) {
          await ctx.reply(`❌ ${missingFiles.length} file(s) are missing. Please convert them again.`, REPLY_OPTIONS);
          return;
        }

        await ctx.reply(
          '✅ All files ready! Reply with:\n' +
          '• "new" to create a new pack\n' +
          '• "existing <pack_name>" to add to existing pack',
          REPLY_OPTIONS
        );
        break;
      }

      case 'help': {
        await ctx.reply(
          'PackPuter Help 📖\n\n' +
          'Commands:\n' +
          '/batch - Upload up to 10 GIFs/videos, convert them all, and create a pack\n' +
          '/convert - Convert one file to a sticker\n' +
          '/ai - AI Sticker Maker: Send a base image, choose a template\n' +
          '/pack - AI Generate Pack: Generate a full sticker pack (6 or 12 stickers)\n' +
          '/done - Finish batch and proceed to pack creation\n\n' +
          'All stickers meet Telegram requirements:\n' +
          '• WEBM VP9 format\n' +
          '• ≤ 3 seconds\n' +
          '• ≤ 30 fps\n' +
          '• 512px max dimension\n' +
          '• ≤ 256 KB',
          REPLY_OPTIONS
        );
        break;
      }

      case 'mypacks': {
        await ctx.reply('This feature will be available soon!', REPLY_OPTIONS);
        break;
      }

      default: {
        console.error(`[${timestamp}] [Router] Unknown command: ${key}`);
        await ctx.reply('Unknown command. Use /help for available commands.', REPLY_OPTIONS);
      }
    }
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [Router] Error executing command ${key}:`, error);
    try {
      await ctx.reply('❌ An error occurred. Please try again.', REPLY_OPTIONS);
    } catch (replyError) {
      console.error(`[${errorTimestamp}] [Router] Failed to send error message:`, replyError);
    }
  }
}

