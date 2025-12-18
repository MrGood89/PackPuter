import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { getTempFilePath } from '../util/file';
import { env } from '../env';
import { stickerCache } from './cache';

export interface ImageGenerationOptions {
  baseImagePath: string;
  context?: string;
  template: string;
  count: number;
}

/**
 * Generate sticker PNGs using Memeputer API
 * Calls Memeputer agent to generate images via webhook
 */
export async function generateStickerPNGs(options: ImageGenerationOptions): Promise<string[]> {
  const { baseImagePath, context, template, count } = options;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [AI Image] Generating ${count} stickers via Memeputer:`, {
    template,
    hasContext: !!context,
    baseImage: baseImagePath,
  });

  // Check cache first
  const cacheKey = stickerCache.generateKey(baseImagePath, {
    template,
    context,
    count,
  });
  
  // For multiple stickers, we can't use cache (each is unique)
  // But we can cache the prepared asset
  if (count === 1) {
    const cached = stickerCache.get(cacheKey);
    if (cached && fs.existsSync(cached)) {
      console.log(`[${timestamp}] [AI Image] Using cached sticker: ${cached}`);
      return [cached];
    }
  }

  // Check if Memeputer is configured
  if (!env.MEMEPUTER_API_KEY || !env.MEMEPUTER_AGENT_ID) {
    console.warn(`[${timestamp}] [AI Image] Memeputer not configured, using fallback`);
    return generateFallbackStickers(baseImagePath, template, count);
  }

  try {
    const generatedPaths: string[] = [];

    // Memeputer API client
    const client = axios.create({
      baseURL: env.MEMEPUTER_API_BASE,
      headers: {
        'x-api-key': env.MEMEPUTER_API_KEY, // Memeputer uses x-api-key header
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes
    });

    // Generate each sticker variation
    for (let i = 0; i < count; i++) {
      const prompt = buildStickerPrompt(template, context, i, count);
      
      console.log(`[${timestamp}] [AI Image] Generating sticker ${i + 1}/${count} via Memeputer`);

      // Read base image as base64
      const imageBuffer = fs.readFileSync(baseImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      const imageMimeType = baseImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Call Memeputer API to generate image
      // Try chat endpoint - Memeputer might use /v1/agents/{id}/chat
      const endpoint = `/v1/agents/${env.MEMEPUTER_AGENT_ID}/chat`;
      
      console.log(`[${timestamp}] [AI Image] Calling Memeputer: ${env.MEMEPUTER_API_BASE}${endpoint}`);
      
      const response = await client.post(
        endpoint,
        {
          message: `Generate a sticker image based on this prompt: ${prompt}. Base image provided as base64. Return image URL or base64.`,
          base_image: `data:${imageMimeType};base64,${imageBase64}`,
          size: '512x512',
          format: 'png',
          transparent: true,
        }
      );

      if (response.data.image_url || response.data.image) {
        // Download the generated image
        const imageUrl = response.data.image_url || response.data.image;
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        // Save to temp file
        const outputPath = getTempFilePath(`ai_sticker_${template}_${i}`, 'png');
        fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
        generatedPaths.push(outputPath);

        console.log(`[${timestamp}] [AI Image] ✅ Generated sticker ${i + 1}/${count}: ${outputPath}`);
      } else if (response.data.data && response.data.data[0]?.url) {
        // Alternative response format
        const imageUrl = response.data.data[0].url;
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const outputPath = getTempFilePath(`ai_sticker_${template}_${i}`, 'png');
        fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
        generatedPaths.push(outputPath);

        console.log(`[${timestamp}] [AI Image] ✅ Generated sticker ${i + 1}/${count}: ${outputPath}`);
      } else {
        console.error(`[${timestamp}] [AI Image] ❌ No image in response for sticker ${i + 1}:`, response.data);
      }
    }

    return generatedPaths;
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [AI Image] ❌ Memeputer generation failed:`, {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // Fallback to simple processing
    console.log(`[${errorTimestamp}] [AI Image] Using fallback generation`);
    return generateFallbackStickers(baseImagePath, template, count);
  }
}

/**
 * Build prompt for sticker generation
 * Enforces: transparent background, sticker cutout look, big readable text, thick white outline
 */
function buildStickerPrompt(
  template: string,
  context: string | undefined,
  variationIndex: number,
  totalCount: number
): string {
  const templateText = getTemplateText(template);
  const variationHint = totalCount > 1 ? ` (variation ${variationIndex + 1} of ${totalCount})` : '';
  const contextHint = context ? ` Context: ${context}.` : '';

  return `Create a Telegram sticker with:
- Transparent background (no scenery, no background, fully transparent behind subject and text)
- Subject: ${contextHint}
- Big, bold, readable text: "${templateText}" at the top
- Thick white outline around the entire sticker (sticker cutout style)
- Sticker aesthetic: clean, bold, high contrast
- Size: 512x512 pixels
- Format: PNG with alpha channel
- Style: modern sticker design, professional${variationHint}`;
}

function getTemplateText(template: string): string {
  const templateTexts: Record<string, string> = {
    GM: 'GM',
    GN: 'GN',
    LFG: 'LFG',
    HIGHER: 'HIGHER',
    HODL: 'HODL',
    WAGMI: 'WAGMI',
    NGMI: 'NGMI',
    SER: 'SER',
    REKT: 'REKT',
    ALPHA: 'ALPHA',
  };
  return templateTexts[template] || template;
}

/**
 * Fallback: Simple image processing when AI is unavailable
 * Just resizes and prepares the base image
 */
async function generateFallbackStickers(
  baseImagePath: string,
  template: string,
  count: number
): Promise<string[]> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AI Image] Using fallback generation (no AI)`);
  
  // For fallback, just return the base image multiple times
  // Post-processing will handle resizing and formatting
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const outputPath = getTempFilePath(`ai_sticker_fallback_${template}_${i}`, 'png');
    fs.copyFileSync(baseImagePath, outputPath);
    paths.push(outputPath);
  }
  return paths;
}

