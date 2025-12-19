import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { getTempFilePath } from '../util/file';
import { env } from '../env';
import { stickerCache } from './cache';

export interface ImageGenerationOptions {
  baseImagePath: string;
  context?: string;
  template?: string;
  count?: number;
  customInstructions?: string;
}

export interface SingleStickerOptions {
  baseImagePath: string;
  context?: string;
  template?: string;
  customInstructions?: string;
}

/**
 * Generate a single sticker PNG using Memeputer API
 * Returns the file path or null if generation fails
 * NO FALLBACK - fails clearly if Memeputer fails
 */
export async function generateSingleSticker(options: SingleStickerOptions): Promise<string | null> {
  const { baseImagePath, context, template, customInstructions } = options;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [AI Image] Generating single sticker via Memeputer:`, {
    template,
    hasContext: !!context,
    hasCustomInstructions: !!customInstructions,
    baseImage: baseImagePath,
  });

  // Check if Memeputer is configured
  if (!env.MEMEPUTER_API_KEY || !env.MEMEPUTER_AGENT_ID) {
    throw new Error('Memeputer not configured. Cannot generate stickers without Memeputer.');
  }

  try {
    const client = axios.create({
      baseURL: env.MEMEPUTER_API_BASE,
      headers: {
        'x-api-key': env.MEMEPUTER_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes
    });

    // Read base image as base64
    const imageBuffer = fs.readFileSync(baseImagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const imageMimeType = baseImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Build prompt
    let prompt: string;
    if (customInstructions) {
      prompt = `Generate a Telegram sticker image based on these custom instructions: ${customInstructions}. ` +
        `Use the same character from the base image. ` +
        `Requirements: transparent background (no scenery, no background), clean sticker cutout style, 512x512 pixels, PNG with alpha channel.`;
    } else if (template) {
      const templateText = getTemplateText(template);
      prompt = buildStickerPrompt(template, context, 0, 1);
    } else {
      throw new Error('Either template or customInstructions must be provided');
    }

    // Call Memeputer API
    const endpoint = `/v1/agents/${env.MEMEPUTER_AGENT_ID}/chat`;
    
    console.log(`[${timestamp}] [AI Image] Calling Memeputer: ${env.MEMEPUTER_API_BASE}${endpoint}`);
    
    const response = await client.post(
      endpoint,
      {
        message: prompt,
        base_image: `data:${imageMimeType};base64,${imageBase64}`,
        sticker_type: 'image_sticker',
      }
    );

    // Parse response - Memeputer should return { type: "image_sticker", image_url: "..." } or { needs: [...] }
    // Handle nested response format (response.data.data.response) or direct format (response.data)
    let responseData = response.data;
    if (responseData?.data?.response) {
      // Try to parse JSON if it's a string
      if (typeof responseData.data.response === 'string') {
        try {
          responseData = JSON.parse(responseData.data.response);
        } catch (e) {
          // If not JSON, check if it contains image URL directly
          responseData = responseData.data;
        }
      } else {
        responseData = responseData.data.response;
      }
    } else if (responseData?.data) {
      responseData = responseData.data;
    }
    
    console.log(`[${timestamp}] [AI Image] Memeputer response:`, {
      hasData: !!responseData,
      type: responseData?.type,
      hasNeeds: !!responseData?.needs,
      hasImageUrl: !!(responseData?.image_url || responseData?.image),
    });
    
    if (responseData?.needs) {
      throw new Error(`Memeputer needs additional information: ${JSON.stringify(responseData.needs)}`);
    }

    if (responseData?.type !== 'image_sticker') {
      console.error(`[${timestamp}] [AI Image] ❌ Unexpected response type:`, responseData);
      throw new Error(`Memeputer returned unexpected response type: ${responseData?.type || 'unknown'}. Expected 'image_sticker'.`);
    }

    const imageUrl = responseData.image_url || responseData.image;
    if (!imageUrl) {
      console.error(`[${timestamp}] [AI Image] ❌ No image URL in response:`, responseData);
      throw new Error('Memeputer did not return an image URL. Response: ' + JSON.stringify(responseData).substring(0, 500));
    }

    // Download the generated image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    // Save to temp file
    const outputPath = getTempFilePath(`ai_sticker_${Date.now()}`, 'png');
    fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));

    console.log(`[${timestamp}] [AI Image] ✅ Generated sticker: ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [AI Image] ❌ Memeputer generation failed:`, {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // NO FALLBACK - fail clearly
    throw new Error(`Memeputer sticker generation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Generate sticker PNGs using Memeputer API
 * Calls Memeputer agent to generate images via webhook
 * @deprecated Use generateSingleSticker for new code
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
 * @deprecated No fallback - Memeputer must succeed
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

