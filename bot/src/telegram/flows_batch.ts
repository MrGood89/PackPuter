import { Context, Telegraf } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { FORCE_REPLY } from './menus';
import { isValidVideoFile, isValidImageFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { workerClient } from '../services/workerClient';
import {
  createStickerSet,
  addStickerToSet,
  getMyStickerSets,
  buildPackShortName,
  getAddStickerLink,
  getStickerSetEmoji,
  resolveStickerSetName,
  extractStickerSetEmoji,
} from './packs';

const MAX_BATCH_SIZE = 10;

// Batch state tracking: queued vs completed files
type BatchState = {
  queued: number;
  completed: number;
  lastUploadAt: number;
  autoProceedSent: boolean;
  timer?: NodeJS.Timeout;
};

const batchStates = new Map<number, BatchState>();

function getBatchState(userId: number): BatchState {
  const existing = batchStates.get(userId);
  if (existing) return existing;
  const s: BatchState = {
    queued: 0,
    completed: 0,
    lastUploadAt: Date.now(),
    autoProceedSent: false,
  };
  batchStates.set(userId, s);
  return s;
}

export function resetBatchState(userId: number) {
  const s = getBatchState(userId);
  if (s.timer) clearTimeout(s.timer);
  s.queued = 0;
  s.completed = 0;
  s.lastUploadAt = Date.now();
  s.autoProceedSent = false;
}

export function setupBatchConvertFlow(bot: Telegraf) {
  // Commands are now handled by router.ts
  // This function only sets up file upload handlers
  
  // Handle file uploads
  bot.on('video', async (ctx) => {
    await handleFileUpload(ctx);
  });

  bot.on('photo', async (ctx) => {
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
      `Batch limit is 10. Processing will start automatically...`
    );
    // Still process the file, but will auto-proceed after conversion
  }

  let fileId: string | undefined;
  let mimeType: string | undefined;

  if (ctx.message && 'video' in ctx.message && ctx.message.video) {
    fileId = ctx.message.video.file_id;
    mimeType = ctx.message.video.mime_type;
  } else if (ctx.message && 'photo' in ctx.message && ctx.message.photo) {
    // Get the largest photo size
    const photos = ctx.message.photo;
    fileId = photos[photos.length - 1].file_id;
    mimeType = 'image/jpeg'; // Telegram photos are always JPEG
  } else if (ctx.message && 'document' in ctx.message && ctx.message.document) {
    fileId = ctx.message.document.file_id;
    mimeType = ctx.message.document.mime_type;
  } else if (ctx.message && 'animation' in ctx.message && ctx.message.animation) {
    fileId = (ctx.message.animation as any).file_id;
    mimeType = (ctx.message.animation as any).mime_type || 'video/gif';
  }

  // Accept both images and videos
  const isVideo = isValidVideoFile(mimeType);
  const isImage = isValidImageFile(mimeType);
  
  if (!fileId || !mimeType || (!isVideo && !isImage)) {
    await ctx.reply('Please send a valid image (PNG/JPG) or video/GIF file.');
    return;
  }

  // Track queued file immediately
  const userId = ctx.from!.id;
  const st = getBatchState(userId);
  st.queued += 1;
  st.lastUploadAt = Date.now();
  console.log(`[${new Date().toISOString()}] [Batch] File queued. Total queued: ${st.queued}, completed: ${st.completed}`);

  // Capture file type info for use in background processing
  const fileIsImage = isImage;
  const fileIsVideo = isVideo;
  const fileMimeType = mimeType;

  // Send immediate response WITHOUT awaiting - this allows handler to return immediately
  const uploadTimestamp = new Date().toISOString();
  console.log(`[${uploadTimestamp}] [Batch] Starting processing for fileId: ${fileId}, mimeType: ${mimeType}, isImage: ${fileIsImage}, isVideo: ${fileIsVideo}`);
  ctx.reply('⏳ Processing...').catch(err => console.error(`[${uploadTimestamp}] [Batch] Failed to send processing message:`, err));
  
  // Process in background - use setImmediate to defer execution
  // This allows the handler to return immediately
  setImmediate(async () => {
    const processTimestamp = new Date().toISOString();
    console.log(`[${processTimestamp}] [Batch] ===== Background processing START =====`);
    console.log(`[${processTimestamp}] [Batch] User: ${ctx.from!.id}, FileId: ${fileId}, Type: ${fileIsImage ? 'image' : 'video'}`);
    
    try {
      console.log(`[${processTimestamp}] [Batch] Step 1: Getting file info from Telegram...`);
      const file = await ctx.telegram.getFile(fileId);
      console.log(`[${processTimestamp}] [Batch] File info received:`, {
        file_id: file.file_id,
        file_path: file.file_path,
        file_size: file.file_size
      });
      
      // Determine file extension based on mime type and file path
      let fileExt = 'tmp';
      const filePathFromTelegram = file.file_path || '';
      
      if (fileIsImage) {
        fileExt = fileMimeType === 'image/png' ? 'png' : 'jpg';
      } else if (fileMimeType?.includes('gif') || filePathFromTelegram.endsWith('.gif')) {
        fileExt = 'gif';
      } else if (fileMimeType?.includes('webm') || filePathFromTelegram.endsWith('.webm')) {
        fileExt = 'webm';
      } else if (fileMimeType?.includes('mp4') || filePathFromTelegram.endsWith('.mp4')) {
        fileExt = 'mp4';
      }
      
      const filePath = getTempFilePath('batch', fileExt);
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

      // Use captured file type info
      let result: { output_path: string; duration?: number; kb: number; width: number; height: number; fps?: number };
      let stickerFormat: 'static' | 'video';
      
      if (fileIsImage) {
        console.log(`[${processTimestamp}] [Batch] Step 3: Processing as image sticker...`);
        const assetResult = await workerClient.prepareAsset(filePath);
        console.log(`[${processTimestamp}] [Batch] Image preparation complete:`, {
          output_path: assetResult.output_path,
          status: assetResult.status
        });
        
        // Get image size (prepareAsset always outputs 512x512 PNG)
        const imageStats = fs.statSync(assetResult.output_path);
        
        result = {
          output_path: assetResult.output_path,
          kb: Math.round(imageStats.size / 1024),
          width: 512, // prepareAsset always outputs 512x512
          height: 512,
        };
        stickerFormat = 'static';
        
        cleanupFile(filePath);
        console.log(`[${processTimestamp}] [Batch] Cleaned up temp input file: ${filePath}`);
      } else {
        console.log(`[${processTimestamp}] [Batch] Step 3: Sending to worker for video conversion...`);
        const convertResult = await workerClient.convert(filePath);
        console.log(`[${processTimestamp}] [Batch] Conversion complete:`, {
          output_path: convertResult.output_path,
          duration: convertResult.duration,
          kb: convertResult.kb,
          width: convertResult.width,
          height: convertResult.height,
          fps: convertResult.fps
        });
        
        result = convertResult;
        stickerFormat = 'video';
        
        cleanupFile(filePath);
        console.log(`[${processTimestamp}] [Batch] Cleaned up temp input file: ${filePath}`);
      }

      // Verify output file exists before storing
      console.log(`[${processTimestamp}] [Batch] Step 4: Verifying output file exists...`);
      const outputExists = fs.existsSync(result.output_path);
      const outputSize = outputExists ? fs.statSync(result.output_path).size : 0;
      console.log(`[${processTimestamp}] [Batch] Output file check:`, {
        path: result.output_path,
        exists: outputExists,
        size: outputSize,
        sizeKB: Math.round(outputSize / 1024),
        format: stickerFormat
      });
      
      if (!outputExists) {
        console.error(`[${processTimestamp}] [Batch] ERROR: Processed file not found at: ${result.output_path}`);
        console.error(`[${processTimestamp}] [Batch] Temp directory contents:`, {
          tempDir: '/tmp/packputer',
          exists: fs.existsSync('/tmp/packputer'),
          files: fs.existsSync('/tmp/packputer') ? fs.readdirSync('/tmp/packputer').slice(0, 20) : []
        });
        throw new Error(`Processed file not found at: ${result.output_path}`);
      }

      // Get fresh session to avoid race conditions
      console.log(`[${processTimestamp}] [Batch] Step 5: Updating session with processed file...`);
      const currentSession = getSession(ctx.from!.id);
      console.log(`[${processTimestamp}] [Batch] Current session before update:`, {
        mode: currentSession.mode,
        fileCount: currentSession.uploadedFiles.length,
        existingPaths: currentSession.uploadedFiles.map(f => f.filePath),
        currentStickerFormat: currentSession.stickerFormat
      });
      
      // Set sticker format in session (use first file's format, or keep existing if mixed)
      if (!currentSession.stickerFormat) {
        currentSession.stickerFormat = stickerFormat;
      } else if (currentSession.stickerFormat !== stickerFormat) {
        // Mixed formats - warn user but allow (they'll need to create separate packs)
        console.warn(`[${processTimestamp}] [Batch] Mixed sticker formats detected: ${currentSession.stickerFormat} and ${stickerFormat}`);
      }
      
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
      console.log(`[${processTimestamp}] [Batch] Session updated, new file count: ${currentSession.uploadedFiles.length}, format: ${currentSession.stickerFormat}`);
      console.log(`[${processTimestamp}] [Batch] All file paths in session:`, currentSession.uploadedFiles.map(f => ({
        fileId: f.fileId,
        filePath: f.filePath,
        exists: f.filePath ? fs.existsSync(f.filePath) : false
      })));

      // Format response message based on file type
      if (fileIsImage) {
        await ctx.reply(
          `✅ Ready: ${result.width}x${result.height}px · ${result.kb}KB (PNG sticker)`
        );
      } else {
        await ctx.reply(
          `✅ Ready: ${result.duration?.toFixed(1)}s · ${result.width}x${result.height}px · ${result.kb}KB`
        );
      }

      // Increment completed count
      const userId = ctx.from!.id;
      const st = getBatchState(userId);
      st.completed += 1;
      console.log(`[${processTimestamp}] [Batch] File completed. Queued: ${st.queued}, Completed: ${st.completed}`);

      // Auto-proceed logic: Check if all queued files are completed
      // Cancel any existing timeout
      if (st.timer) {
        clearTimeout(st.timer);
        console.log(`[${processTimestamp}] [Batch] Cancelled previous auto-proceed timeout for user ${userId}`);
      }

      // Set a debounced timeout to check if all files are done
      st.timer = setTimeout(async () => {
        try {
          const idleMs = Date.now() - st.lastUploadAt;
          const allDone = st.completed === st.queued;
          const checkSession = getSession(userId);

          console.log(`[${new Date().toISOString()}] [Batch] Auto-proceed check for user ${userId}:`, {
            queued: st.queued,
            completed: st.completed,
            allDone,
            idleMs,
            mode: checkSession.mode,
            autoProceedSent: st.autoProceedSent
          });

          // Only send once, only in batch mode, only if all queued files are completed
          // and no new upload happened in the last 2.5 seconds
          if (!st.autoProceedSent && 
              allDone && 
              idleMs >= 2500 && 
              checkSession.mode === 'batch') {
            
            st.autoProceedSent = true;
            const autoProceedTimestamp = new Date().toISOString();
            console.log(`[${autoProceedTimestamp}] [Batch] All files completed! Sending auto-proceed message for user ${userId}`);
            
            await ctx.reply(
              '✅ All files converted! Reply with:\n' +
              '• "new" to create a new pack\n' +
              '• "existing <pack_name>" to add to existing pack',
              FORCE_REPLY
            );
          } else {
            const checkTimestamp = new Date().toISOString();
            console.log(`[${checkTimestamp}] [Batch] Not ready for auto-proceed:`, {
              allDone,
              idleMs,
              autoProceedSent: st.autoProceedSent,
              mode: checkSession.mode
            });
          }
        } catch (error: any) {
          console.error(`[Batch] Error in auto-proceed for user ${userId}:`, error);
        }
      }, 2600); // 2.6 second debounce - ensures no new uploads happened
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
        await ctx.reply('❌ Failed to convert file. Please try another file.');
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

  setSession(ctx.from!.id, { packTitle: title, awaitingEmojiPick: true, emojiPickPage: 0 });
  
  // Use inline keyboard instead of force reply
  const { emojiPickerKeyboard } = await import('./ui');
  await ctx.reply('Choose an emoji for this pack (tap one):', emojiPickerKeyboard(0));
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
  
  // Allow batch, pack, ai, and ai_image modes for pack creation
  const validModes = ['batch', 'pack', 'ai', 'ai_image'];
  if (!session.mode || !validModes.includes(session.mode) || session.uploadedFiles.length === 0) {
    console.log(`[${packTimestamp}] [Pack Creation] Invalid session state - mode: ${session.mode}, files: ${session.uploadedFiles.length} - EXITING`);
    return;
  }

  // Validate emoji - allow up to 4 characters for complex emojis (e.g., with variation selectors)
  if (!emoji || emoji.length > 4) {
    console.log(`[${packTimestamp}] [Pack Creation] Invalid emoji - EXITING`);
    // If using emoji picker, show it again instead of asking to type
    const session = getSession(ctx.from!.id);
    if (session.awaitingEmojiPick) {
      const { emojiPickerKeyboard } = await import('./ui');
      await ctx.reply('Please select an emoji from the buttons:', emojiPickerKeyboard(session.emojiPickPage || 0));
    } else {
      await ctx.reply('Please send a single emoji.', FORCE_REPLY);
    }
    return;
  }

  setSession(ctx.from!.id, { emoji });

  try {
    if (session.chosenPackAction === 'existing' && session.existingPackName) {
      // Add to existing pack
      await ctx.reply('📦 Adding stickers to pack...');
      
      // Use the resolved pack name from session (should already be resolved)
      const packName = session.existingPackName;
      console.log(`[${packTimestamp}] [Pack Creation] Adding to existing pack: "${packName}"`);
      
      let addedCount = 0;
      
      // Determine sticker format from session (defaults to 'video' for batch mode)
      const stickerFormat = session.stickerFormat || 'video';
      
      for (const file of session.uploadedFiles) {
        if (file.filePath && fs.existsSync(file.filePath)) {
          console.log(`[${packTimestamp}] [Pack Creation] Adding sticker to pack "${packName}" (format: ${stickerFormat})`);
          const success = await addStickerToSet(ctx, packName, file.filePath, emoji, stickerFormat);
          if (success) {
            addedCount++;
            console.log(`[${packTimestamp}] [Pack Creation] Successfully added sticker ${addedCount}`);
          } else {
            console.error(`[${packTimestamp}] [Pack Creation] Failed to add sticker to pack "${packName}"`);
          }
        }
      }
      
      const link = getAddStickerLink(packName);
      await ctx.reply(`✅ Added ${addedCount} sticker(s)! View pack: ${link}`);
    } else {
      // Create new pack
      await ctx.reply('📦 Creating sticker pack...');

      const shortName = buildPackShortName(session.packTitle || 'MyPack');

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
        await ctx.reply(`❌ ${missingFiles.length} file(s) not found. Please try converting again.`);
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
        await ctx.reply('❌ First sticker file not found. The file may have been cleaned up. Please try again.');
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

      // Determine sticker format from session (defaults to 'video' for batch mode)
      const stickerFormat = session.stickerFormat || 'video';
      
      const created = await createStickerSet(
        ctx,
        session.packTitle || 'My Pack',
        shortName,
        firstFile.filePath,
        emoji,
        stickerFormat
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
              const added = await addStickerToSet(ctx, shortName, file.filePath, emoji, stickerFormat);
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

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Pack Creation] Fetching emoji from existing pack: ${packName}`);

  // Resolve pack name (auto-append _by_<bot> if needed)
  const resolvedPackName = resolveStickerSetName(packName);
  console.log(`[${timestamp}] [Pack Creation] Resolved pack name: "${packName}" -> "${resolvedPackName}"`);

  // Get emoji from existing pack using RESOLVED name
  // Call API directly with resolved name to avoid double resolution
  let packEmoji: string | null = null;
  try {
    const result = await (ctx as any).telegram.callApi("getStickerSet", {
      name: resolvedPackName,
    });
    packEmoji = extractStickerSetEmoji(result);
    console.log(`[${timestamp}] [Pack Creation] Successfully fetched sticker set "${resolvedPackName}", emoji: ${packEmoji}`);
  } catch (error: any) {
    console.error(`[${timestamp}] [Pack Creation] Failed to get sticker set "${resolvedPackName}":`, error.message);
  }
  
  if (!packEmoji) {
    console.error(`[${timestamp}] [Pack Creation] Failed to get emoji from pack "${resolvedPackName}"`);
    // Show emoji picker instead of asking user to type
    const { emojiPickerKeyboard } = await import('./ui');
    setSession(ctx.from!.id, { 
      awaitingEmojiPick: true, 
      emojiPickPage: 0,
      existingPackName: resolvedPackName // Keep the resolved name
    });
    await ctx.reply(
      `Couldn't read the pack emoji. Pick one to apply to new stickers:`,
      emojiPickerKeyboard(0)
    );
    return;
  }

  console.log(`[${timestamp}] [Pack Creation] Got emoji from pack: ${packEmoji}`);
  
  // CRITICAL: Store the RESOLVED pack name in session BEFORE calling handlePackEmoji
  // This ensures handlePackEmoji uses the correct resolved name
  setSession(ctx.from!.id, { 
    existingPackName: resolvedPackName,  // Store resolved name
    emoji: packEmoji 
  });
  
  // Verify session was updated correctly
  const updatedSession = getSession(ctx.from!.id);
  console.log(`[${timestamp}] [Pack Creation] Session updated with existingPackName: "${updatedSession.existingPackName}"`);
  
  // Proceed directly to adding stickers (skip emoji prompt)
  await handlePackEmoji(ctx, packEmoji);
}

