import { Context, Telegraf } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { doneButton, packActionKeyboard, getAddStickerLink } from './menus';
import { isValidVideoFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { workerClient } from '../services/workerClient';
import {
  createStickerSet,
  addStickerToSet,
  getMyStickerSets,
} from './packs';
import { generateShortName } from '../util/slug';

const MAX_BATCH_SIZE = 10;

export function setupBatchConvertFlow(bot: Telegraf) {
  bot.hears('🧰 Batch Convert (≤10)', async (ctx) => {
    const session = getSession(ctx.from!.id);
    resetSession(ctx.from!.id);
    setSession(ctx.from!.id, { mode: 'batch' });

    await ctx.reply(
      `Send up to 10 GIFs/videos. I'll convert each into Telegram-ready stickers.\nWhen finished, press ✅ Done.`,
      doneButton
    );
  });

  bot.hears('✅ Done', async (ctx) => {
    const session = getSession(ctx.from!.id);
    if (session.mode !== 'batch' || session.uploadedFiles.length === 0) {
      await ctx.reply('No files to process. Use Batch Convert to start.');
      return;
    }

    await ctx.reply(
      'Create new pack or add to existing?',
      packActionKeyboard
    );
  });

  bot.hears('📦 Create New Pack', async (ctx) => {
    const session = getSession(ctx.from!.id);
    if (session.mode !== 'batch') return;

    setSession(ctx.from!.id, { chosenPackAction: 'new' });
    await ctx.reply('What should the pack title be?');
  });

  bot.hears('➕ Add to Existing', async (ctx) => {
    const session = getSession(ctx.from!.id);
    if (session.mode !== 'batch') return;

    const packs = await getMyStickerSets(ctx);
    if (packs.length === 0) {
      await ctx.reply(
        'No existing packs found. Creating a new pack instead.',
        packActionKeyboard
      );
      setSession(ctx.from!.id, { chosenPackAction: 'new' });
      await ctx.reply('What should the pack title be?');
      return;
    }

    setSession(ctx.from!.id, { chosenPackAction: 'existing' });
    const packList = packs.map((p, i) => `${i + 1}. ${p}`).join('\n');
    await ctx.reply(
      `Which pack? Reply with the pack name:\n\n${packList}`
    );
  });

  // Handle file uploads
  bot.on('video', async (ctx) => {
    await handleFileUpload(ctx);
  });

  bot.on('document', async (ctx) => {
    if ('document' in ctx.message && ctx.message.document?.mime_type) {
      await handleFileUpload(ctx);
    }
  });

  bot.on('animation', async (ctx) => {
    await handleFileUpload(ctx);
  });
}

async function handleFileUpload(ctx: Context) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'batch') return;

  if (session.uploadedFiles.length >= MAX_BATCH_SIZE) {
    await ctx.reply(
      `Batch limit is 10. Press ✅ Done or start a new batch.`
    );
    return;
  }

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

  try {
    await ctx.reply('⏳ Processing...');

    const file = await ctx.telegram.getFile(fileId);
    const filePath = getTempFilePath('batch', 'tmp');
    const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, Buffer.from(response.data));

    const result = await workerClient.convert(filePath);
    cleanupFile(filePath);

    session.uploadedFiles.push({
      fileId,
      filePath: result.output_path,
      metadata: {
        duration: result.duration,
        kb: result.kb,
        width: result.width,
        height: result.height,
        fps: result.fps,
      },
    });

    setSession(ctx.from!.id, session);

    await ctx.reply(
      `✅ Ready: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`
    );
  } catch (error) {
    console.error('Conversion error:', error);
    await ctx.reply('❌ Failed to convert file. Please try another file.');
  }
}

export async function handlePackTitle(ctx: Context, title: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'batch' || session.chosenPackAction !== 'new') return;

  setSession(ctx.from!.id, { packTitle: title });
  await ctx.reply('Choose one emoji to apply to all stickers:');
}

export async function handlePackEmoji(ctx: Context, emoji: string) {
  const session = getSession(ctx.from!.id);
  if ((session.mode !== 'batch' && session.mode !== 'pack') || session.uploadedFiles.length === 0) return;

  if (!emoji || emoji.length > 2) {
    await ctx.reply('Please send a single emoji.');
    return;
  }

  setSession(ctx.from!.id, { emoji });

  try {
    if (session.chosenPackAction === 'existing' && session.existingPackName) {
      // Add to existing pack
      await ctx.reply('📦 Adding stickers to pack...');
      
      const packName = session.existingPackName;
      let addedCount = 0;
      
      for (const file of session.uploadedFiles) {
        if (file.filePath && fs.existsSync(file.filePath)) {
          const success = await addStickerToSet(ctx, packName, file.filePath, emoji);
          if (success) {
            addedCount++;
          }
        }
      }
      
      const link = getAddStickerLink(packName);
      await ctx.reply(`✅ Added ${addedCount} sticker(s)! View pack: ${link}`);
    } else {
      // Create new pack
      await ctx.reply('📦 Creating sticker pack...');

      const shortName = generateShortName(
        session.packTitle || 'MyPack',
        env.BOT_USERNAME
      );

      // Create pack with first sticker
      const firstFile = session.uploadedFiles[0];
      if (!firstFile.filePath || !fs.existsSync(firstFile.filePath)) {
        await ctx.reply('❌ First sticker file not found.');
        return;
      }

      const created = await createStickerSet(
        ctx,
        session.packTitle || 'My Pack',
        shortName,
        firstFile.filePath,
        emoji
      );

      if (!created) {
        await ctx.reply('❌ Failed to create sticker set. It may already exist.');
        return;
      }

      // Add remaining stickers
      for (let i = 1; i < session.uploadedFiles.length; i++) {
        const file = session.uploadedFiles[i];
        if (file.filePath && fs.existsSync(file.filePath)) {
          await addStickerToSet(ctx, shortName, file.filePath, emoji);
        }
      }

      const link = getAddStickerLink(shortName);
      await ctx.reply(`✅ Pack created! Add it here: ${link}`);
    }

    // Cleanup
    session.uploadedFiles.forEach((file) => {
      if (file.filePath) cleanupFile(file.filePath);
    });
    resetSession(ctx.from!.id);
  } catch (error) {
    console.error('Pack creation error:', error);
    await ctx.reply('❌ Failed to create pack.');
  }
}

export async function handleExistingPackName(ctx: Context, packName: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'batch' || session.chosenPackAction !== 'existing') return;

  setSession(ctx.from!.id, { existingPackName: packName });
  await ctx.reply('Choose one emoji to apply to all stickers:');
}

