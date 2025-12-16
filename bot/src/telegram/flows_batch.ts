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

    // Verify all files still exist
    const missingFiles = session.uploadedFiles.filter(f => !f.filePath || !fs.existsSync(f.filePath));
    if (missingFiles.length > 0) {
      console.error('Files missing when Done pressed:', missingFiles);
      await ctx.reply(`❌ ${missingFiles.length} file(s) are missing. Please convert them again.`);
      return;
    }

    await ctx.reply(
      '✅ All files ready! Create new pack or add to existing?',
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

  // Send immediate response and return to avoid timeout
  await ctx.reply('⏳ Processing...');
  
  // Process in background - use setTimeout(0) to truly defer execution
  setTimeout(async () => {
    try {
      const file = await ctx.telegram.getFile(fileId);
      const filePath = getTempFilePath('batch', 'tmp');
      const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Download with timeout
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000 // 2 minutes for download
      });
      fs.writeFileSync(filePath, Buffer.from(response.data));

      const result = await workerClient.convert(filePath);
      cleanupFile(filePath);

      // Verify output file exists before storing
      if (!fs.existsSync(result.output_path)) {
        throw new Error(`Converted file not found at: ${result.output_path}`);
      }

      // Get fresh session to avoid race conditions
      const currentSession = getSession(ctx.from!.id);
      currentSession.uploadedFiles.push({
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

      setSession(ctx.from!.id, currentSession);

      await ctx.reply(
        `✅ Ready: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`
      );

      // Auto-proceed if we've reached the batch limit or if user has 10 files
      if (currentSession.uploadedFiles.length >= MAX_BATCH_SIZE) {
        await ctx.reply(
          '✅ All files converted! Create new pack or add to existing?',
          packActionKeyboard
        );
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      console.error('Error details:', {
        fileId,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      try {
        await ctx.reply('❌ Failed to convert file. Please try another file.');
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  }, 0);
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
      
      // Verify all files exist before proceeding
      const missingFiles = session.uploadedFiles.filter(f => !f.filePath || !fs.existsSync(f.filePath));
      if (missingFiles.length > 0) {
        console.error('Missing files:', missingFiles.map(f => f.filePath));
        console.error('All files:', session.uploadedFiles.map(f => ({
          path: f.filePath,
          exists: f.filePath ? fs.existsSync(f.filePath) : false,
          size: f.filePath && fs.existsSync(f.filePath) ? fs.statSync(f.filePath).size : 0
        })));
        await ctx.reply(`❌ ${missingFiles.length} file(s) not found. Please try converting again.`);
        return;
      }
      
      if (!firstFile.filePath || !fs.existsSync(firstFile.filePath)) {
        console.error('First sticker file not found:', firstFile.filePath);
        console.error('File system check:', {
          tempDir: '/tmp/packputer',
          tempDirExists: fs.existsSync('/tmp/packputer'),
          filesInTemp: fs.existsSync('/tmp/packputer') ? fs.readdirSync('/tmp/packputer').slice(0, 10) : [],
          firstFilePath: firstFile.filePath,
          firstFileExists: firstFile.filePath ? fs.existsSync(firstFile.filePath) : false,
        });
        await ctx.reply('❌ First sticker file not found. The file may have been cleaned up. Please try again.');
        return;
      }

      console.log('Creating sticker set:', {
        title: session.packTitle || 'My Pack',
        shortName,
        firstFile: firstFile.filePath,
        fileExists: firstFile.filePath ? fs.existsSync(firstFile.filePath) : false,
        emoji,
      });

      const created = await createStickerSet(
        ctx,
        session.packTitle || 'My Pack',
        shortName,
        firstFile.filePath,
        emoji
      );

      if (!created) {
        console.error('createStickerSet returned false');
        await ctx.reply('❌ Failed to create sticker set. It may already exist. Check bot logs for details.');
        return;
      }

      console.log('Sticker set created successfully:', shortName);

      // Add remaining stickers
      for (let i = 1; i < session.uploadedFiles.length; i++) {
        const file = session.uploadedFiles[i];
        if (file.filePath && fs.existsSync(file.filePath)) {
          console.log(`Adding sticker ${i + 1}/${session.uploadedFiles.length} to pack:`, file.filePath);
          const added = await addStickerToSet(ctx, shortName, file.filePath, emoji);
          if (!added) {
            console.error(`Failed to add sticker ${i + 1} to pack`);
          }
        } else {
          console.error(`Sticker ${i + 1} file not found:`, file.filePath);
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
  } catch (error: any) {
    console.error('Pack creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      mode: session.mode,
      packTitle: session.packTitle,
      emoji: session.emoji,
      filesCount: session.uploadedFiles.length,
    });
    await ctx.reply('❌ Failed to create pack. Check bot logs for details.');
  }
}

export async function handleExistingPackName(ctx: Context, packName: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'batch' || session.chosenPackAction !== 'existing') return;

  setSession(ctx.from!.id, { existingPackName: packName });
  await ctx.reply('Choose one emoji to apply to all stickers:');
}

