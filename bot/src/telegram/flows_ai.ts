import { Context } from 'telegraf';
import fs from 'fs';
import axios from 'axios';
import { getSession, setSession, resetSession } from './sessions';
import { env } from '../env';
import { isValidImageFile } from '../util/validate';
import { getTempFilePath, cleanupFile } from '../util/file';
import { workerClient } from '../services/workerClient';
import { memeputerClient } from '../services/memeputerClient';
import { FORCE_REPLY } from './menus';
import {
  createStickerSet,
  addStickerToSet,
  getMyStickerSets,
  buildPackShortName,
  getAddStickerLink,
} from './packs';

export function setupAIFlows(bot: any) {
  // Commands are now handled by router.ts
  // This function only sets up file upload handlers

  // Handle image uploads for AI flows
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
  if (session.mode === 'ai') {
    await handleAIStickerMaker(ctx);
  } else if (session.mode === 'pack') {
    await handleAIGeneratePack(ctx);
  }
}

async function handleAIStickerMaker(ctx: Context) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai') return;

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
  const processingMsg = await ctx.reply('⏳ Downloading image...');
  
  // Process asynchronously to avoid blocking
  setImmediate(async () => {
    try {
      const file = await ctx.telegram.getFile(fileId);
      const filePath = getTempFilePath('ai_base', 'png');
      const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000 // 2 minutes for download
      });
      fs.writeFileSync(filePath, Buffer.from(response.data));

      setSession(ctx.from!.id, { uploadedFiles: [{ fileId, filePath }] });

      await ctx.reply(
        'What is this project/coin/mascot about? (vibe, inside jokes, do\'s/don\'ts, colors, keywords)\n\nOr send /skip to skip.',
      );
    } catch (error: any) {
      console.error('Image download error:', error);
      try {
        await ctx.reply('❌ Failed to download image.');
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  });
}

export async function handleProjectContext(ctx: Context, text: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai' || session.uploadedFiles.length === 0) return;

  if (text.toLowerCase() === '/skip') {
    setSession(ctx.from!.id, { projectContext: '' });
  } else {
    setSession(ctx.from!.id, { projectContext: text });
  }

  await ctx.reply('Choose a template. Reply with one of: GM, GN, LFG, HIGHER, HODL, WAGMI, NGMI, SER, REKT, ALPHA', FORCE_REPLY);
}

export async function handleTemplate(ctx: Context, templateInput: string) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'ai' || session.uploadedFiles.length === 0) return;

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

  // Store templates for processing
  setSession(ctx.from!.id, { chosenTemplate: templates.join(',') });

  // Send immediate response
  if (templates.length === 1) {
    await ctx.reply(`🎨 Generating sticker with AI (${templates[0]})...`);
  } else {
    await ctx.reply(`🎨 Generating ${templates.length} stickers with AI...`);
  }
  
  // Process asynchronously to avoid blocking
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
        metadata: {
          duration: number;
          kb: number;
          width: number;
          height: number;
          fps: number;
        };
      }> = [];

      // Generate sticker for each template
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        
        if (templates.length > 1) {
          await ctx.reply(`Generating ${i + 1}/${templates.length} (${template})...`);
        }

        // Get blueprint from Memeputer AI agent with enhanced context
        // The AI agent should use the project context to create a more relevant blueprint
        const blueprint = await memeputerClient.getBlueprint(
          template,
          session.projectContext || undefined,
          undefined // user_prompt - could be added later for custom instructions
        );

        const blueprintJson = JSON.stringify(blueprint);
        const result = await workerClient.aiRender(baseImage.filePath, blueprintJson);

        generatedStickers.push({
          fileId: '',
          filePath: result.output_path,
          metadata: {
            duration: result.duration,
            kb: result.kb,
            width: result.width,
            height: result.height,
            fps: result.fps,
          },
        });
      }

      // Ask which pack to add to
      if (generatedStickers.length === 1) {
        await ctx.reply('✅ Sticker generated! Reply with:\n' +
          '• "new" to create a new pack\n' +
          '• "existing <pack_name>" to add to existing pack');
      } else {
        await ctx.reply(`✅ ${generatedStickers.length} stickers generated! Reply with:\n` +
          '• "new" to create a new pack\n' +
          '• "existing <pack_name>" to add to existing pack');
      }

      // Store all generated stickers and switch to batch mode for pack creation
      const currentSession = getSession(ctx.from!.id);
      setSession(ctx.from!.id, {
        ...currentSession,
        mode: 'batch', // Switch to batch mode for pack creation flow
        uploadedFiles: generatedStickers,
        chosenPackAction: undefined, // Will be set when user responds
        autoProceedSent: false,
      });

      cleanupFile(baseImage.filePath);
    } catch (error: any) {
      console.error('AI render error:', error);
      try {
        await ctx.reply('❌ Failed to generate sticker(s).');
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  });
}

async function handleAIGeneratePack(ctx: Context) {
  const session = getSession(ctx.from!.id);
  if (session.mode !== 'pack' || !session.packSize || !session.theme) return;

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
  const processingMsg = await ctx.reply('🎨 Generating sticker pack with AI...');
  
  // Store values before async callback (TypeScript safety)
  const packSize = session.packSize;
  const theme = session.theme;
  const projectContext = session.projectContext;
  
  if (!packSize || !theme) {
    await ctx.reply('❌ Missing pack size or theme.');
    return;
  }
  
  // Process asynchronously to avoid blocking
  setImmediate(async () => {
    try {
      const file = await ctx.telegram.getFile(fileId);
      const baseImagePath = getTempFilePath('pack_base', 'png');
      const url = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000 // 2 minutes for download
      });
      fs.writeFileSync(baseImagePath, Buffer.from(response.data));

      const blueprints = await memeputerClient.getBlueprints(
        packSize,
        'GM', // Default template
        projectContext,
        theme
      );

      const stickerPaths: string[] = [];

      for (let i = 0; i < blueprints.length; i++) {
        await ctx.reply(`Generating sticker ${i + 1}/${blueprints.length}...`);

        const blueprintJson = JSON.stringify(blueprints[i]);
        const result = await workerClient.aiRender(baseImagePath, blueprintJson);
        stickerPaths.push(result.output_path);
      }

      // Ask for pack title
      await ctx.reply('What should the pack title be?', FORCE_REPLY);
      const currentSession = getSession(ctx.from!.id);
      setSession(ctx.from!.id, {
        ...currentSession,
        uploadedFiles: stickerPaths.map((path) => ({ fileId: '', filePath: path })),
        chosenPackAction: 'new', // Always create new for AI packs
      });

      cleanupFile(baseImagePath);
    } catch (error: any) {
      console.error('AI pack generation error:', error);
      try {
        await ctx.reply('❌ Failed to generate pack.');
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  });
}

