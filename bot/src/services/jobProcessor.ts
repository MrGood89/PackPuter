import { Telegraf } from 'telegraf';
import { getSupabaseClient, createJob, updateJobStatus, getPendingJobs, ConversionJob } from './supabaseClient';
import { workerClient } from './workerClient';
import { memeputerClient } from './memeputerClient';
import { getTempFilePath, cleanupFile } from '../util/file';
import { getSession, setSession } from '../telegram/sessions';
import { createStickerSet, addStickerToSet, getAddStickerLink } from '../telegram/packs';
import { generateShortName } from '../util/slug';
import { env } from '../env';
import fs from 'fs';
import axios from 'axios';

let processing = false;
let processorInterval: NodeJS.Timeout | null = null;

export function startJobProcessor(bot: Telegraf) {
  if (processorInterval) {
    return; // Already running
  }

  // Process jobs every 2 seconds
  processorInterval = setInterval(async () => {
    if (processing) return;
    await processNextJob(bot);
  }, 2000);

  // Cleanup expired jobs every hour
  setInterval(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('conversion_jobs')
        .delete()
        .lt('expires_at', new Date().toISOString());
      if (!error) {
        console.log('Cleaned up expired jobs');
      }
    }
  }, 60 * 60 * 1000);

  console.log('Job processor started');
}

export function stopJobProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
}

async function processNextJob(bot: Telegraf) {
  const jobs = await getPendingJobs(1);
  if (jobs.length === 0) return;

  const job = jobs[0];
  processing = true;

  try {
    await updateJobStatus(job.id!, 'processing');

    switch (job.job_type) {
      case 'convert':
        await processConvertJob(bot, job);
        break;
      case 'batch':
        await processBatchJob(bot, job);
        break;
      case 'ai_render':
        await processAIRenderJob(bot, job);
        break;
      case 'ai_pack':
        await processAIPackJob(bot, job);
        break;
    }

    await updateJobStatus(job.id!, 'completed');
  } catch (error: any) {
    console.error(`Job ${job.id} failed:`, error);
    await updateJobStatus(job.id!, 'failed', undefined, error.message || String(error));
    
    try {
      await bot.telegram.sendMessage(
        job.chat_id,
        `❌ Failed to process your request: ${error.message || 'Unknown error'}`
      );
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  } finally {
    processing = false;
  }
}

async function processConvertJob(bot: Telegraf, job: ConversionJob) {
  if (!job.file_id || !job.file_path) {
    throw new Error('Missing file_id or file_path');
  }

  // Download file
  const file = await bot.telegram.getFile(job.file_id);
  const tempPath = getTempFilePath('convert', 'tmp');
  const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
  fs.writeFileSync(tempPath, Buffer.from(response.data));

  // Convert
  const result = await workerClient.convert(tempPath);
  cleanupFile(tempPath);

  // Send result
  await bot.telegram.sendVideo(
    job.chat_id,
    { source: fs.createReadStream(result.output_path) },
    {
      caption: `✅ Converted: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`,
    }
  );

  cleanupFile(result.output_path);
}

async function processBatchJob(bot: Telegraf, job: ConversionJob) {
  // Batch jobs are handled differently - they store multiple files
  // For now, this is a placeholder
  throw new Error('Batch job processing not yet implemented');
}

async function processAIRenderJob(bot: Telegraf, job: ConversionJob) {
  if (!job.file_path || !job.metadata?.template) {
    throw new Error('Missing file_path or template');
  }

  const blueprint = await memeputerClient.getBlueprint(
    job.metadata.template,
    job.metadata.projectContext || ''
  );

  const result = await workerClient.aiRender(job.file_path, JSON.stringify(blueprint));

  await bot.telegram.sendVideo(
    job.chat_id,
    { source: fs.createReadStream(result.output_path) },
    {
      caption: `✅ Generated: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`,
    }
  );

  cleanupFile(result.output_path);
}

async function processAIPackJob(bot: Telegraf, job: ConversionJob) {
  // AI pack generation
  throw new Error('AI pack job processing not yet implemented');
}

