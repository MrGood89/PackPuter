import { Context, Telegraf } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { getAddStickerLink, REPLY_OPTIONS } from './menus';
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
  // Command: /batch
  bot.command('batch', async (ctx) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Batch] /batch command received from user ${ctx.from!.id}`);
    
    const session = getSession(ctx.from!.id);
    resetSession(ctx.from!.id);
    setSession(ctx.from!.id, { mode: 'batch' });

    await ctx.reply(
      `Send up to 10 GIFs/videos. I'll convert each into Telegram-ready stickers.\nWhen finished, use /done command.`,
      REPLY_OPTIONS
    );
  });

  // Command: /done
  bot.command('done', async (ctx) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Batch] /done command received from user ${ctx.from!.id}`);
    const session = getSession(ctx.from!.id);
    if (session.mode !== 'batch' || session.uploadedFiles.length === 0) {
      await ctx.reply('No files to process. Use /batch to start.', REPLY_OPTIONS);
      return;
    }

    // Verify all files still exist
    const missingFiles = session.uploadedFiles.filter(f => !f.filePath || !fs.existsSync(f.filePath));
    if (missingFiles.length > 0) {
      console.error('Files missing when Done pressed:', missingFiles);
      await ctx.reply(`❌ ${missingFiles.length} file(s) are missing. Please convert them again.`, REPLY_OPTIONS);
      return;
    }

    await ctx.reply(
      '✅ All files ready! Reply with:\n' +
      '• "new" to create a new pack\n' +
      '• "existing <pack_name>" to add to existing pack',
      REPLY_OPTIONS
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
  const startTimestamp = new Date().toISOString();
  console.log(`[${startTimestamp}] [Batch] ===== handleFileUpload START =====`);
  console.log(`[${startTimestamp}] [Batch] User ID: ${ctx.from!.id}, Chat ID: ${ctx.chat?.id}`);
  
  const session = getSession(ctx.from!.id);
  console.log(`[${startTimestamp}] [Batch] Session mode: ${session.mode}, Current file count: ${session.uploadedFiles.length}`);
  
  if (session.mode !== 'batch') {
    console.log(`[${startTimestamp}] [Batch] User ${ctx.from!.id} not in batch mode, mode: ${session.mode} - EXITING`);
    return;
  }

  if (session.uploadedFiles.length >= MAX_BATCH_SIZE) {
    console.log(`[${startTimestamp}] [Batch] Batch limit reached (${session.uploadedFiles.length}/${MAX_BATCH_SIZE})`);
    await ctx.reply(
      `Batch limit is 10. Processing will start automatically...`,
      REPLY_OPTIONS
    );
    // Still process the file, but will auto-proceed after conversion
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
    await ctx.reply('Please send a valid GIF or video file.', REPLY_OPTIONS);
    return;
  }

  // Send immediate response WITHOUT awaiting - this allows handler to return immediately
  const uploadTimestamp = new Date().toISOString();
  console.log(`[${uploadTimestamp}] [Batch] Starting processing for fileId: ${fileId}, mimeType: ${mimeType}`);
  ctx.reply('⏳ Processing...', REPLY_OPTIONS).catch(err => console.error(`[${uploadTimestamp}] [Batch] Failed to send processing message:`, err));
  
  // Process in background - use setImmediate to defer execution
  // This allows the handler to return immediately
  setImmediate(async () => {
    const processTimestamp = new Date().toISOString();
    console.log(`[${processTimestamp}] [Batch] ===== Background processing START =====`);
    console.log(`[${processTimestamp}] [Batch] User: ${ctx.from!.id}, FileId: ${fileId}`);
    
    try {
      console.log(`[${processTimestamp}] [Batch] Step 1: Getting file info from Telegram...`);
      const file = await ctx.telegram.getFile(fileId);
      console.log(`[${processTimestamp}] [Batch] File info received:`, {
        file_id: file.file_id,
        file_path: file.file_path,
        file_size: file.file_size
      });
      
      const filePath = getTempFilePath('batch', 'tmp');
      console.log(`[${processTimestamp}] [Batch] Step 2: Downloading file to: ${filePath}`);
      const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Download with timeout
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000 // 2 minutes for download
      });
      console.log(`[${processTimestamp}] [Batch] File downloaded, size: ${response.data.byteLength} bytes`);
      fs.writeFileSync(filePath, Buffer.from(response.data));
      console.log(`[${processTimestamp}] [Batch] File saved to disk: ${filePath}, exists: ${fs.existsSync(filePath)}`);

      console.log(`[${processTimestamp}] [Batch] Step 3: Sending to worker for conversion...`);
      const result = await workerClient.convert(filePath);
      console.log(`[${processTimestamp}] [Batch] Conversion complete:`, {
        output_path: result.output_path,
        duration: result.duration,
        kb: result.kb,
        width: result.width,
        height: result.height,
        fps: result.fps
      });
      
      cleanupFile(filePath);
      console.log(`[${processTimestamp}] [Batch] Cleaned up temp input file: ${filePath}`);

      // Verify output file exists before storing
      console.log(`[${processTimestamp}] [Batch] Step 4: Verifying output file exists...`);
      const outputExists = fs.existsSync(result.output_path);
      const outputSize = outputExists ? fs.statSync(result.output_path).size : 0;
      console.log(`[${processTimestamp}] [Batch] Output file check:`, {
        path: result.output_path,
        exists: outputExists,
        size: outputSize,
        sizeKB: Math.round(outputSize / 1024)
      });
      
      if (!outputExists) {
        console.error(`[${processTimestamp}] [Batch] ERROR: Converted file not found at: ${result.output_path}`);
        console.error(`[${processTimestamp}] [Batch] Temp directory contents:`, {
          tempDir: '/tmp/packputer',
          exists: fs.existsSync('/tmp/packputer'),
          files: fs.existsSync('/tmp/packputer') ? fs.readdirSync('/tmp/packputer').slice(0, 20) : []
        });
        throw new Error(`Converted file not found at: ${result.output_path}`);
      }

      // Get fresh session to avoid race conditions
      console.log(`[${processTimestamp}] [Batch] Step 5: Updating session with converted file...`);
      const currentSession = getSession(ctx.from!.id);
      console.log(`[${processTimestamp}] [Batch] Current session before update:`, {
        mode: currentSession.mode,
        fileCount: currentSession.uploadedFiles.length,
        existingPaths: currentSession.uploadedFiles.map(f => f.filePath)
      });
      
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
      console.log(`[${processTimestamp}] [Batch] Session updated, new file count: ${currentSession.uploadedFiles.length}`);
      console.log(`[${processTimestamp}] [Batch] All file paths in session:`, currentSession.uploadedFiles.map(f => ({
        fileId: f.fileId,
        filePath: f.filePath,
        exists: f.filePath ? fs.existsSync(f.filePath) : false
      })));

      await ctx.reply(
        `✅ Ready: ${result.duration.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`,
        REPLY_OPTIONS
      );

      // Auto-proceed after a short delay to allow user to send more files
      // If no new files arrive within 3 seconds, proceed automatically
      const fileCountAtCompletion = currentSession.uploadedFiles.length;
      setTimeout(async () => {
        try {
          const finalSession = getSession(ctx.from!.id);
          // Only auto-proceed if still in batch mode and we have files
          if (finalSession.mode === 'batch' && finalSession.uploadedFiles.length > 0) {
            // Check if user sent more files (compare file count)
            const fileCountAfterDelay = finalSession.uploadedFiles.length;
            // If file count matches what we had, user hasn't sent more - proceed
            if (fileCountAfterDelay === fileCountAtCompletion) {
              console.log(`[Batch] Auto-proceeding for user ${ctx.from!.id} with ${fileCountAfterDelay} files`);
              await ctx.reply(
                '✅ All files converted! Reply with:\n' +
                '• "new" to create a new pack\n' +
                '• "existing <pack_name>" to add to existing pack',
                REPLY_OPTIONS
              );
            } else {
              console.log(`[Batch] User ${ctx.from!.id} sent more files (${fileCountAfterDelay} vs ${fileCountAtCompletion}), not auto-proceeding yet`);
            }
          }
        } catch (error: any) {
          console.error(`[Batch] Error in auto-proceed for user ${ctx.from!.id}:`, error);
        }
      }, 3000); // 3 second delay
    } catch (error: any) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] [Batch] ===== ERROR in background processing =====`);
      console.error(`[${errorTimestamp}] [Batch] User: ${ctx.from!.id}, FileId: ${fileId}`);
      console.error(`[${errorTimestamp}] [Batch] Error:`, error);
      console.error(`[${errorTimestamp}] [Batch] Error details:`, {
        fileId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name
      });
      try {
        await ctx.reply('❌ Failed to convert file. Please try another file.', REPLY_OPTIONS);
      } catch (replyError) {
        console.error(`[${errorTimestamp}] [Batch] Failed to send error message:`, replyError);
      }
      console.error(`[${errorTimestamp}] [Batch] ===== ERROR processing END =====`);
    }
    console.log(`[${processTimestamp}] [Batch] ===== Background processing END =====`);
  });
  console.log(`[${startTimestamp}] [Batch] Handler returned immediately, processing in background`);
  console.log(`[${startTimestamp}] [Batch] ===== handleFileUpload END =====`);
}

export async function handlePackTitle(ctx: Context, title: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'batch' || session.chosenPackAction !== 'new') return;

  setSession(ctx.from!.id, { packTitle: title });
  await ctx.reply('Choose one emoji to apply to all stickers:', REPLY_OPTIONS);
}

export async function handlePackEmoji(ctx: Context, emoji: string) {
  const packTimestamp = new Date().toISOString();
  console.log(`[${packTimestamp}] [Pack Creation] ===== handlePackEmoji START =====`);
  console.log(`[${packTimestamp}] [Pack Creation] User: ${ctx.from!.id}, Emoji: ${emoji}`);
  
  const session = getSession(ctx.from!.id);
  console.log(`[${packTimestamp}] [Pack Creation] Session:`, {
    mode: session.mode,
    fileCount: session.uploadedFiles.length,
    packTitle: session.packTitle,
    chosenPackAction: session.chosenPackAction,
    existingPackName: session.existingPackName
  });
  
  if ((session.mode !== 'batch' && session.mode !== 'pack') || session.uploadedFiles.length === 0) {
    console.log(`[${packTimestamp}] [Pack Creation] Invalid session state - EXITING`);
    return;
  }

  if (!emoji || emoji.length > 2) {
    console.log(`[${packTimestamp}] [Pack Creation] Invalid emoji - EXITING`);
    await ctx.reply('Please send a single emoji.', REPLY_OPTIONS);
    return;
  }

  setSession(ctx.from!.id, { emoji });

  try {
    if (session.chosenPackAction === 'existing' && session.existingPackName) {
      // Add to existing pack
      await ctx.reply('📦 Adding stickers to pack...', REPLY_OPTIONS);
      
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
      await ctx.reply(`✅ Added ${addedCount} sticker(s)! View pack: ${link}`, REPLY_OPTIONS);
    } else {
      // Create new pack
      await ctx.reply('📦 Creating sticker pack...', REPLY_OPTIONS);

      const shortName = generateShortName(
        session.packTitle || 'MyPack',
        env.BOT_USERNAME
      );

      // Create pack with first sticker
      const firstFile = session.uploadedFiles[0];
      
      // Verify all files exist before proceeding
      console.log(`[${packTimestamp}] [Pack Creation] Step 1: Verifying all files exist...`);
      console.log(`[${packTimestamp}] [Pack Creation] Total files to check: ${session.uploadedFiles.length}`);
      console.log(`[${packTimestamp}] [Pack Creation] First file:`, {
        fileId: firstFile.fileId,
        filePath: firstFile.filePath,
        exists: firstFile.filePath ? fs.existsSync(firstFile.filePath) : false
      });
      
      const fileChecks = session.uploadedFiles.map(f => {
        const exists = f.filePath ? fs.existsSync(f.filePath) : false;
        const size = (f.filePath && exists) ? fs.statSync(f.filePath).size : 0;
        return {
          fileId: f.fileId,
          path: f.filePath,
          exists,
          size,
          sizeKB: Math.round(size / 1024)
        };
      });
      console.log(`[${packTimestamp}] [Pack Creation] File checks:`, JSON.stringify(fileChecks, null, 2));
      
      const missingFiles = session.uploadedFiles.filter(f => !f.filePath || !fs.existsSync(f.filePath));
      if (missingFiles.length > 0) {
        console.error(`[${packTimestamp}] [Pack Creation] ERROR: ${missingFiles.length} file(s) missing!`);
        console.error(`[${packTimestamp}] [Pack Creation] Missing files:`, missingFiles.map(f => f.filePath));
        console.error(`[${packTimestamp}] [Pack Creation] Temp directory check:`, {
          tempDir: '/tmp/packputer',
          exists: fs.existsSync('/tmp/packputer'),
          files: fs.existsSync('/tmp/packputer') ? fs.readdirSync('/tmp/packputer').slice(0, 30) : []
        });
        await ctx.reply(`❌ ${missingFiles.length} file(s) not found. Please try converting again.`, REPLY_OPTIONS);
        return;
      }
      
      console.log(`[${packTimestamp}] [Pack Creation] All files verified!`);
      
      if (!firstFile.filePath || !fs.existsSync(firstFile.filePath)) {
        console.error('[Pack Creation] First sticker file not found:', firstFile.filePath);
        console.error('[Pack Creation] File system check:', {
          tempDir: '/tmp/packputer',
          tempDirExists: fs.existsSync('/tmp/packputer'),
          filesInTemp: fs.existsSync('/tmp/packputer') ? fs.readdirSync('/tmp/packputer').slice(0, 20) : [],
          firstFilePath: firstFile.filePath,
          firstFileExists: firstFile.filePath ? fs.existsSync(firstFile.filePath) : false,
          allFilePaths: session.uploadedFiles.map(f => f.filePath),
        });
        await ctx.reply('❌ First sticker file not found. The file may have been cleaned up. Please try again.', REPLY_OPTIONS);
        return;
      }
      
      console.log('[Pack Creation] First file verified:', {
        path: firstFile.filePath,
        exists: true,
        size: fs.statSync(firstFile.filePath).size
      });

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
        await ctx.reply('❌ Failed to create sticker set. It may already exist. Check bot logs for details.', REPLY_OPTIONS);
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
      await ctx.reply(`✅ Pack created! Add it here: ${link}`, REPLY_OPTIONS);
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
    await ctx.reply('❌ Failed to create pack. Check bot logs for details.', REPLY_OPTIONS);
  }
}

export async function handleExistingPackName(ctx: Context, packName: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'batch' || session.chosenPackAction !== 'existing') return;

  setSession(ctx.from!.id, { existingPackName: packName });
  await ctx.reply('Choose one emoji to apply to all stickers:', REPLY_OPTIONS);
}

