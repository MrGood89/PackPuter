import { Context, Telegraf } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { isValidImageFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { FORCE_REPLY } from './menus';
import { generateStickerPNGs, generateSingleSticker } from '../services/memeputerImageClient';
import { postprocessStickerPng } from '../services/stickerPostprocess';
import { workerClient } from '../services/workerClient';
import { getTemplate } from '../ai/templates/stickers';
import {
  createStickerSet,
  addStickerToSet,
  buildPackShortName,
  getAddStickerLink,
} from './packs';

export function setupAIImageFlow(bot: Telegraf) {
  const setupTimestamp = new Date().toISOString();
  console.log(`[${setupTimestamp}] [AI Image Flow] Registering photo and document handlers`);
  
  // Use middleware approach to catch ALL messages with photos/documents
  // This ensures we check before other handlers consume the update
  bot.use(async (ctx: Context, next: () => Promise<void>) => {
    const session = getSession(ctx.from!.id);
    
    // Only process if in ai_image mode
    if (session.mode !== 'ai_image') {
      return next(); // Let other handlers process
    }
    
    // Check for photo
    if (ctx.message && 'photo' in ctx.message && ctx.message.photo) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [AI Image Flow Middleware] Photo detected for user ${ctx.from?.id}`);
      await handleImageUpload(ctx);
      return; // Don't call next() - we handled it
    }
    
    // Check for document (image)
    if (ctx.message && 'document' in ctx.message && ctx.message.document?.mime_type) {
      const mimeType = ctx.message.document.mime_type;
      if (isValidImageFile(mimeType)) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [AI Image Flow Middleware] Image document detected for user ${ctx.from?.id}, mimeType: ${mimeType}`);
        await handleImageUpload(ctx);
        return; // Don't call next() - we handled it
      }
    }
    
    // Not a photo/document or not an image - let other handlers process
    return next();
  });
  
  console.log(`[${setupTimestamp}] [AI Image Flow] Middleware registered successfully`);
}

async function handleImageUpload(ctx: Context) {
  const session = getSession(ctx.from!.id);
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AI Image Upload] Handler called, mode: ${session.mode}, userId: ${ctx.from?.id}`);
  
  if (session.mode !== 'ai_image') {
    console.log(`[${timestamp}] [AI Image Upload] Wrong mode, returning early. Expected 'ai_image', got '${session.mode}'`);
    return;
  }

  let fileId: string | undefined;
  let mimeType: string | undefined;

  if (ctx.message && 'photo' in ctx.message && ctx.message.photo) {
    const photos = ctx.message.photo;
    fileId = photos[photos.length - 1].file_id;
    mimeType = 'image/jpeg';
    console.log(`[${timestamp}] [AI Image Upload] Photo detected, fileId: ${fileId}`);
  } else if (ctx.message && 'document' in ctx.message && ctx.message.document) {
    fileId = ctx.message.document.file_id;
    mimeType = ctx.message.document.mime_type;
    console.log(`[${timestamp}] [AI Image Upload] Document detected, fileId: ${fileId}, mimeType: ${mimeType}`);
  } else {
    console.log(`[${timestamp}] [AI Image Upload] No photo or document found in message`);
    return;
  }

  if (!fileId || !mimeType || !isValidImageFile(mimeType)) {
    console.log(`[${timestamp}] [AI Image Upload] Invalid file: fileId=${fileId}, mimeType=${mimeType}`);
    await ctx.reply('Please send a valid image file (PNG or JPG).');
    return;
  }

  // Send immediate response
  await ctx.reply('⏳ Downloading image...');
  
  // Process asynchronously
  setImmediate(async () => {
    try {
      const file = await ctx.telegram.getFile(fileId!);
      const filePath = getTempFilePath('ai_image_base', 'png');
      const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000
      });
      fs.writeFileSync(filePath, Buffer.from(response.data));

      // Prepare asset using worker (asset-first pipeline)
      await ctx.reply('🎨 Preparing sticker asset (removing background, adding outline)...');
      try {
        const assetResult = await workerClient.prepareAsset(filePath);
        const assetPath = assetResult.output_path;
        
        // Update session with prepared asset
        setSession(ctx.from!.id, { uploadedFiles: [{ fileId: fileId!, filePath: assetPath }] });
        
        // Cleanup original file
        cleanupFile(filePath);
        
        await ctx.reply(
          'What is this project/coin/mascot about? (vibe, inside jokes, do\'s/don\'ts, colors, keywords)\n\nOr send /skip to skip.',
        );
      } catch (assetError: any) {
        console.error('Asset preparation error:', assetError);
        // Fallback: use original image
        setSession(ctx.from!.id, { uploadedFiles: [{ fileId: fileId!, filePath }] });
        await ctx.reply(
          '⚠️ Asset preparation failed, using original image.\n\nWhat is this project/coin/mascot about? (vibe, inside jokes, do\'s/don\'ts, colors, keywords)\n\nOr send /skip to skip.',
        );
      }
    } catch (error: any) {
      console.error('Image download error:', error);
      await ctx.reply('❌ Failed to download image.');
    }
  });
}

export async function handleAIImageContext(ctx: Context, text: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai_image' || session.uploadedFiles.length === 0) return;

  if (text.toLowerCase() === '/skip') {
    setSession(ctx.from!.id, { projectContext: '' });
  } else {
    setSession(ctx.from!.id, { projectContext: text });
  }

  // Ask user to choose mode: custom (single) or auto-generated (batch)
  const { Markup } = require('telegraf');
  await ctx.reply(
    'Choose sticker mode:\n\n' +
    '• **Custom sticker** - You provide instructions, I generate one sticker\n' +
    '• **Auto-generated set** - I generate common crypto stickers (GM, GN, LFG, etc.)',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎨 Custom Sticker (Single)', 'img_mode:custom')],
      [Markup.button.callback('📦 Auto-Generated Set', 'img_mode:auto')],
    ])
  );
}

/**
 * Handle custom sticker instructions (Mode A: Custom sticker)
 */
export async function handleCustomStickerInstructions(ctx: Context, instructions: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai_image' || session.uploadedFiles.length === 0) return;

  setSession(ctx.from!.id, { customInstructions: instructions });

  await ctx.reply('🎨 Generating custom sticker with AI...');

  setImmediate(async () => {
    try {
      const baseImage = session.uploadedFiles[0];
      if (!baseImage.filePath || !fs.existsSync(baseImage.filePath)) {
        await ctx.reply('❌ Base image not found.');
        return;
      }

      // Generate single sticker using Memeputer
      const generatedPath = await generateSingleSticker({
        baseImagePath: baseImage.filePath,
        context: session.projectContext || undefined,
        customInstructions: instructions,
      });

      if (!generatedPath) {
        await ctx.reply('❌ Failed to generate sticker. Memeputer did not return a valid image.');
        return;
      }

      // Verify file exists
      if (!fs.existsSync(generatedPath)) {
        await ctx.reply('❌ Generated sticker file not found.');
        return;
      }

      // Send preview
      try {
        await ctx.replyWithPhoto(
          { source: generatedPath },
          {
            caption: '✅ Custom sticker generated!\n\nReply with:\n• "new" to create a new pack\n• "existing <pack_name>" to add to existing pack'
          }
        );
      } catch (error: any) {
        console.error('Failed to send preview:', error);
        await ctx.reply('✅ Custom sticker generated! Reply with:\n• "new" to create a new pack\n• "existing <pack_name>" to add to existing pack');
      }

      // Store for pack creation
      setSession(ctx.from!.id, {
        uploadedFiles: [{
          fileId: '',
          filePath: generatedPath,
        }],
        stickerFormat: 'static',
      });

      // Cleanup asset
      if (fs.existsSync(baseImage.filePath)) {
        cleanupFile(baseImage.filePath);
      }
    } catch (error: any) {
      console.error('Custom sticker generation error:', error);
      await ctx.reply('❌ Failed to generate sticker. ' + (error.message || 'Unknown error'));
    }
  });
}

/**
 * Generate auto-generated sticker set (Mode B: Auto-generated set)
 * Generates one-by-one for common crypto templates
 */
export async function generateAutoStickerSet(ctx: Context) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai_image' || session.uploadedFiles.length === 0) return;

  const templates = ['GM', 'GN', 'LFG', 'HIGHER', 'HODL', 'WAGMI', 'NGMI', 'SER', 'REKT', 'ALPHA'];
  const generatedStickers: Array<{ fileId: string; filePath: string }> = [];

  try {
    const baseImage = session.uploadedFiles[0];
    if (!baseImage.filePath || !fs.existsSync(baseImage.filePath)) {
      await ctx.reply('❌ Base image not found.');
      return;
    }

    // Generate one sticker per template, one-by-one
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      await ctx.reply(`Generating ${i + 1}/${templates.length} (${template})...`);

      try {
        const generatedPath = await generateSingleSticker({
          baseImagePath: baseImage.filePath,
          context: session.projectContext || undefined,
          template: template,
        });

        if (generatedPath && fs.existsSync(generatedPath)) {
          generatedStickers.push({
            fileId: '',
            filePath: generatedPath,
          });
        } else {
          console.error(`Failed to generate sticker for ${template}`);
          await ctx.reply(`⚠️ Failed to generate ${template}, continuing...`);
        }
      } catch (error: any) {
        console.error(`Error generating ${template}:`, error);
        await ctx.reply(`⚠️ Error generating ${template}: ${error.message || 'Unknown error'}. Continuing...`);
      }
    }

    if (generatedStickers.length === 0) {
      await ctx.reply('❌ Failed to generate any stickers. Please try again.');
      return;
    }

    // Ask which pack to add to
    await ctx.reply(`✅ ${generatedStickers.length} sticker(s) generated! Reply with:\n` +
      '• "new" to create a new pack\n' +
      '• "existing <pack_name>" to add to existing pack');

    // Store all generated stickers
    setSession(ctx.from!.id, {
      uploadedFiles: generatedStickers,
      stickerFormat: 'static',
    });

    // Send preview of first sticker
    if (generatedStickers.length > 0) {
      try {
        await ctx.replyWithPhoto(
          { source: generatedStickers[0].filePath },
          {
            caption: `✅ ${generatedStickers.length} sticker(s) generated!\n\nReply with:\n• "new" to create a new pack\n• "existing <pack_name>" to add to existing pack`
          }
        );
      } catch (error: any) {
        console.error('Failed to send preview:', error);
      }
    }

    // Cleanup asset
    if (fs.existsSync(baseImage.filePath)) {
      cleanupFile(baseImage.filePath);
    }
  } catch (error: any) {
    console.error('Auto sticker set generation error:', error);
    await ctx.reply('❌ Failed to generate stickers. ' + (error.message || 'Unknown error'));
  }
}

export async function handleAIImageTemplate(ctx: Context, templateInput: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai_image' || session.uploadedFiles.length === 0) return;

  // Parse multiple templates (comma-separated or space-separated)
  const templates = templateInput
    .split(/[,\s]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0)
    .filter(t => ['GM', 'GN', 'LFG', 'HIGHER', 'HODL', 'WAGMI', 'NGMI', 'SER', 'REKT', 'ALPHA'].includes(t));

  if (templates.length === 0) {
    await ctx.reply('❌ No valid templates found. Please choose from: GM, GN, LFG, HIGHER, HODL, WAGMI, NGMI, SER, REKT, ALPHA');
    return;
  }

  // Determine count: if multiple templates, generate one per template; otherwise generate 5-10
  const count = templates.length > 1 ? templates.length : 8; // Default 8 stickers for single template

  setSession(ctx.from!.id, { chosenTemplate: templates.join(',') });

  // Send immediate response
  await ctx.reply(`🎨 Generating ${count} image stickers with AI...`);
  
  // Process asynchronously
  setImmediate(async () => {
    try {
      const baseImage = session.uploadedFiles[0];
      if (!baseImage.filePath || !fs.existsSync(baseImage.filePath)) {
        await ctx.reply('❌ Base image not found.');
        return;
      }

      const generatedStickers: Array<{
        fileId: string;
        filePath: string;
        metadata?: {
          width?: number;
          height?: number;
          kb?: number;
        };
      }> = [];

      // Generate stickers for each template (or multiple variations if single template)
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const variationsPerTemplate = templates.length === 1 ? Math.ceil(count / templates.length) : 1;
        
        if (templates.length > 1) {
          await ctx.reply(`Generating ${i + 1}/${templates.length} (${template})...`);
        }

        try {
          // Get template definition for better prompts
          const templateDef = getTemplate(template);
          
          // Generate PNG stickers using AI service (asset-first: baseImage.filePath is already prepared asset)
          const pngPaths = await generateStickerPNGs({
            baseImagePath: baseImage.filePath, // This is the prepared asset
            context: session.projectContext || undefined,
            template: template,
            count: variationsPerTemplate,
          });

          // Post-process each PNG (resize, add outline, optimize)
          for (const pngPath of pngPaths) {
            const processedPath = await postprocessStickerPng(pngPath);
            
            // Verify file exists and get metadata
            if (fs.existsSync(processedPath)) {
              const stats = fs.statSync(processedPath);
              const size = require('sharp')(processedPath).metadata();
              
              generatedStickers.push({
                fileId: '',
                filePath: processedPath,
                metadata: {
                  width: (await size).width,
                  height: (await size).height,
                  kb: Math.round(stats.size / 1024),
                },
              });
            }
          }
        } catch (error: any) {
          console.error(`Error generating stickers for template ${template}:`, error);
          await ctx.reply(`❌ Failed to generate stickers for ${template}. Continuing...`);
        }
      }

      if (generatedStickers.length === 0) {
        await ctx.reply('❌ Failed to generate any stickers. Please try again.');
        return;
      }

      // Ask which pack to add to
      await ctx.reply(`✅ ${generatedStickers.length} sticker(s) generated! Reply with:\n` +
        '• "new" to create a new pack\n' +
        '• "existing <pack_name>" to add to existing pack');

      // Store all generated stickers - KEEP mode as 'ai_image' until pack creation completes
      const currentSession = getSession(ctx.from!.id);
      setSession(ctx.from!.id, {
        ...currentSession,
        mode: 'ai_image', // Keep AI image mode (don't switch to batch)
        uploadedFiles: generatedStickers,
        chosenPackAction: undefined,
        stickerFormat: 'static', // Mark as static stickers
        autoProceedSent: false,
      });
      
      // Send preview of generated stickers
      for (let i = 0; i < generatedStickers.length; i++) {
        const sticker = generatedStickers[i];
        try {
          await ctx.replyWithPhoto(
            { source: sticker.filePath },
            {
              caption: i === 0 
                ? `✅ Sticker ${i + 1}/${generatedStickers.length} generated!\n\nReply with:\n• "new" to create a new pack\n• "existing <pack_name>" to add to existing pack`
                : `✅ Sticker ${i + 1}/${generatedStickers.length}`
            }
          );
        } catch (error: any) {
          console.error(`Failed to send preview for sticker ${i + 1}:`, error);
          // Fallback: just send text
          if (i === 0) {
            await ctx.reply(`✅ ${generatedStickers.length} sticker(s) generated! Reply with:\n• "new" to create a new pack\n• "existing <pack_name>" to add to existing pack`);
          }
        }
      }
      
      // Only show pack options once (already shown in first preview)
      if (generatedStickers.length === 0) {
        await ctx.reply('✅ Sticker generated! Reply with:\n' +
          '• "new" to create a new pack\n' +
          '• "existing <pack_name>" to add to existing pack');
      }

      // Cleanup asset (original base image was already cleaned up)
      if (fs.existsSync(baseImage.filePath)) {
        cleanupFile(baseImage.filePath);
        console.log(`[${new Date().toISOString()}] [AI Image] Cleaned up asset: ${baseImage.filePath}`);
      }
    } catch (error: any) {
      console.error('AI image generation error:', error);
      await ctx.reply('❌ Failed to generate stickers.');
    }
  });
}

