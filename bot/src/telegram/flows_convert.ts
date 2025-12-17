import { Context } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { isValidVideoFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { workerClient } from '../services/workerClient';
import { createJob } from '../services/supabaseClient';
// No keyboard imports needed

export function setupSingleConvertFlow(bot: any) {
  // Commands are now handled by router.ts
  // This function only sets up file upload handlers

  bot.on('video', async (ctx: Context) => {
    await handleSingleFile(ctx);
  });

  bot.on('document', async (ctx: Context) => {
    if (ctx.message && 'document' in ctx.message && ctx.message.document?.mime_type) {
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

  if (ctx.message && 'video' in ctx.message && ctx.message.video) {
    fileId = ctx.message.video.file_id;
    mimeType = ctx.message.video.mime_type;
  } else if (ctx.message && 'document' in ctx.message && ctx.message.document) {
    fileId = ctx.message.document.file_id;
    mimeType = ctx.message.document.mime_type;
  } else if (ctx.message && 'animation' in ctx.message && ctx.message.animation) {
    fileId = (ctx.message.animation as any).file_id;
    mimeType = (ctx.message.animation as any).mime_type || 'video/gif';
  }

  if (!fileId || !mimeType || !isValidVideoFile(mimeType)) {
    await ctx.reply('Please send a valid GIF or video file.');
    return;
  }

  // Create job and return immediately to avoid timeout
  const jobId = await createJob({
    user_id: ctx.from!.id,
    chat_id: ctx.chat!.id,
    job_type: 'convert',
    file_id: fileId,
  });

  if (!jobId) {
    // Fallback: process immediately if Supabase not available
    await ctx.reply('⏳ Converting...');
    setImmediate(async () => {
      try {
        const file = await ctx.telegram.getFile(fileId);
        const filePath = getTempFilePath('convert', 'tmp');
        const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const response = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 120000
        });
        fs.writeFileSync(filePath, Buffer.from(response.data));
        const result = await workerClient.convert(filePath);
        await ctx.replyWithVideo(
          { source: fs.createReadStream(result.output_path) },
          {
            caption: `✅ Converted: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`,
          }
        );
        cleanupFile(filePath);
        cleanupFile(result.output_path);
        resetSession(ctx.from!.id);
      } catch (error: any) {
        console.error('Conversion error:', error);
        await ctx.reply('❌ Failed to convert file.');
      }
    });
  } else {
    // Job created successfully - processor will handle it
    await ctx.reply('⏳ Processing your file... I\'ll send it when ready!');
    resetSession(ctx.from!.id);
  }
}

