import { Context, Telegraf } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { isValidImageFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { FORCE_REPLY } from './menus';
import { generateStickerPNGs } from '../services/memeputerImageClient';
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
  // Handle image uploads for AI Image flow
  bot.on('photo', async (ctx: Context) => {
    await handleImageUpload(ctx);
  });

  bot.on('document', async (ctx: Context) => {
    if (ctx.message && 'document' in ctx.message && ctx.message.document?.mime_type) {
      const mimeType = ctx.message.document.mime_type;
      if (isValidImageFile(mimeType)) {
        await handleImageUpload(ctx);
      }
    }
  });
}

async function handleImageUpload(ctx: Context) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai_image') return;

  let fileId: string | undefined;
  let mimeType: string | undefined;

  if (ctx.message && 'photo' in ctx.message && ctx.message.photo) {
    const photos = ctx.message.photo;
    fileId = photos[photos.length - 1].file_id;
    mimeType = 'image/jpeg';
  } else if (ctx.message && 'document' in ctx.message && ctx.message.document) {
    fileId = ctx.message.document.file_id;
    mimeType = ctx.message.document.mime_type;
  }

  if (!fileId || !mimeType || !isValidImageFile(mimeType)) {
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

  await ctx.reply('Choose a template. Reply with one of: GM, GN, LFG, HIGHER, HODL, WAGMI, NGMI, SER, REKT, ALPHA', FORCE_REPLY);
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

      // Store all generated stickers and switch to batch mode for pack creation
      const currentSession = getSession(ctx.from!.id);
      setSession(ctx.from!.id, {
        ...currentSession,
        mode: 'batch', // Switch to batch mode for pack creation flow
        uploadedFiles: generatedStickers,
        chosenPackAction: undefined,
        stickerFormat: 'static', // Mark as static stickers
        autoProceedSent: false,
      });

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

