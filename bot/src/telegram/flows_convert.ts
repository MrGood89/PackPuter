import { Context } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { isValidVideoFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { workerClient } from '../services/workerClient';
import { mainMenu } from './menus';

export function setupSingleConvertFlow(bot: any) {
  bot.hears('🎞️ Single Convert', async (ctx: Context) => {
    resetSession(ctx.from!.id);
    setSession(ctx.from!.id, { mode: 'convert' });

    await ctx.reply(
      'Send a GIF or video file to convert to a Telegram sticker.',
      mainMenu
    );
  });

  bot.on('video', async (ctx: Context) => {
    await handleSingleFile(ctx);
  });

  bot.on('document', async (ctx: Context) => {
    if ('document' in ctx.message && ctx.message.document?.mime_type) {
      await handleSingleFile(ctx);
    }
  });

  bot.on('animation', async (ctx: Context) => {
    await handleSingleFile(ctx);
  });
}

async function handleSingleFile(ctx: Context) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'convert') return;

  let fileId: string | undefined;
  let mimeType: string | undefined;

  if ('video' in ctx.message && ctx.message.video) {
    fileId = ctx.message.video.file_id;
    mimeType = ctx.message.video.mime_type;
  } else if ('document' in ctx.message && ctx.message.document) {
    fileId = ctx.message.document.file_id;
    mimeType = ctx.message.document.mime_type;
  } else if ('animation' in ctx.message && ctx.message.animation) {
    fileId = (ctx.message.animation as any).file_id;
    mimeType = (ctx.message.animation as any).mime_type || 'video/gif';
  }

  if (!fileId || !mimeType || !isValidVideoFile(mimeType)) {
    await ctx.reply('Please send a valid GIF or video file.');
    return;
  }

  try {
    await ctx.reply('⏳ Converting...');

    const file = await ctx.telegram.getFile(fileId);
    const filePath = getTempFilePath('convert', 'tmp');
    const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, Buffer.from(response.data));

    const result = await workerClient.convert(filePath);

    // Send the converted sticker
    await ctx.replyWithVideo(
      { source: fs.createReadStream(result.output_path) },
      {
        caption: `✅ Converted: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`,
      }
    );

    cleanupFile(filePath);
    cleanupFile(result.output_path);
    resetSession(ctx.from!.id);
  } catch (error) {
    console.error('Conversion error:', error);
    await ctx.reply('❌ Failed to convert file.');
  }
}

