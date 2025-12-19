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
  baseImageUrl: string; // Public HTTPS URL to the prepared asset
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
  const { baseImageUrl, context, template, customInstructions } = options;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [AI Image] Generating single sticker via Memeputer:`, {
    template,
    hasContext: !!context,
    hasCustomInstructions: !!customInstructions,
    baseImageUrl: maskUrlForLogging(baseImageUrl),
  });
  
  // Validate URL format
  let imageUrl: URL;
  try {
    imageUrl = new URL(baseImageUrl);
    if (imageUrl.protocol !== 'https:') {
      throw new Error('Base image URL must use HTTPS');
    }
  } catch (error: any) {
    throw new Error(`Invalid base image URL: ${error.message}`);
  }
  
  // Preflight check: Verify URL is accessible
  console.log(`[${timestamp}] [AI Image] Preflight check: Verifying image URL is accessible...`);
  try {
    const preflightResponse = await axios.head(baseImageUrl, {
      timeout: 10000,
      validateStatus: (status) => status < 500, // Accept redirects, but not server errors
    });
    
    // If HEAD not allowed, try GET with Range header
    if (preflightResponse.status === 405 || preflightResponse.status === 501) {
      console.log(`[${timestamp}] [AI Image] HEAD not allowed, trying GET with Range header...`);
      const rangeResponse = await axios.get(baseImageUrl, {
        headers: { Range: 'bytes=0-1024' },
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
      
      if (rangeResponse.status !== 200 && rangeResponse.status !== 206) {
        throw new Error(`Preflight GET failed with status ${rangeResponse.status}`);
      }
      
      const contentType = rangeResponse.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}, expected image/*`);
      }
      
      console.log(`[${timestamp}] [AI Image] ✅ Preflight check passed (GET): status ${rangeResponse.status}, content-type: ${contentType}`);
    } else if (preflightResponse.status === 200) {
      const contentType = preflightResponse.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}, expected image/*`);
      }
      
      const contentLength = preflightResponse.headers['content-length'];
      console.log(`[${timestamp}] [AI Image] ✅ Preflight check passed (HEAD): status 200, content-type: ${contentType}${contentLength ? `, size: ${contentLength} bytes` : ''}`);
    } else {
      throw new Error(`Preflight HEAD failed with status ${preflightResponse.status}`);
    }
  } catch (preflightError: any) {
    console.error(`[${timestamp}] [AI Image] ❌ Preflight check failed:`, preflightError.message);
    throw new Error(`Hosted image URL not accessible by Memeputer: ${preflightError.message}. URL: ${maskUrlForLogging(baseImageUrl)}`);
  }
  
  // Helper function to mask URL for logging
  function maskUrlForLogging(url: string): string {
    try {
      const urlObj = new URL(url);
      const maskedSearch = urlObj.search.replace(/token=[^&]*/gi, 'token=***').replace(/signature=[^&]*/gi, 'signature=***');
      return `${urlObj.origin}${urlObj.pathname}${maskedSearch}`;
    } catch {
      return url.substring(0, 50) + '...';
    }
  }

  // Check if Memeputer is configured
  if (!env.MEMEPUTER_API_KEY || !env.MEMEPUTER_AGENT_ID) {
    throw new Error('Memeputer not configured. Cannot generate stickers without Memeputer.');
  }

  try {
    // Memeputer API client - will use multipart/form-data for requests with images
    const client = axios.create({
      baseURL: env.MEMEPUTER_API_BASE,
      headers: {
        'x-api-key': env.MEMEPUTER_API_KEY,
        // Don't set Content-Type here - FormData will set it with boundary
      },
      timeout: 120000, // 2 minutes
    });

    // Build prompt - be more explicit about what we need
    let prompt: string;
    if (customInstructions) {
      prompt = `Generate a Telegram sticker image. Custom instructions: ${customInstructions}. ` +
        `The base image is a prepared character asset (transparent background, white outline, already cut out). ` +
        `Generate the sticker showing the character performing the action described in the custom instructions. ` +
        `Requirements: ` +
        `- Use the exact same character from the base image (same face, same outfit, same proportions) ` +
        `- Transparent background (no scenery, no background, no environment) ` +
        `- Clean sticker cutout style ` +
        `- 512x512 pixels ` +
        `- PNG format with alpha channel ` +
        `- Single character only, no extra people or objects ` +
        `- Keep character identity consistent ` +
        `Return the image as a URL or base64.`;
    } else if (template) {
      prompt = buildStickerPrompt(template, context, 0, 1);
    } else {
      throw new Error('Either template or customInstructions must be provided');
    }

    // Call Memeputer API - Agent expects specific fields based on knowledge base
    const endpoint = `/v1/agents/${env.MEMEPUTER_AGENT_ID}/chat`;
    
    // First, test message-only call to confirm agent is healthy
    console.log(`[${timestamp}] [AI Image] Testing agent health with message-only call...`);
    try {
      const healthCheckResponse = await client.post(
        endpoint,
        { message: 'test' },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[${timestamp}] [AI Image] ✅ Agent health check passed, status: ${healthCheckResponse.status}`);
    } catch (healthError: any) {
      const healthHeaders = healthError.response?.headers || {};
      const healthRequestId = healthHeaders['x-request-id'] || healthHeaders['request-id'] || 'N/A';
      console.error(`[${timestamp}] [AI Image] ⚠️ Agent health check failed:`, {
        message: healthError.message,
        status: healthError.response?.status,
        requestId: healthRequestId,
      });
      // Continue anyway - might be a false negative
    }
    
    // Build JSON request body with URL reference (no base64)
    const requestBody: any = {
      message: prompt,
      base_image_url: baseImageUrl, // Send public HTTPS URL
      base_image_ref: baseImageUrl, // Also send as ref for compatibility
      sticker_format: 'image',
      sticker_type: 'image_sticker',
      asset_prepared: true,
      mode: customInstructions ? 'custom' : 'auto',
    };
    
    if (customInstructions) {
      requestBody.user_prompt = customInstructions;
    } else if (template) {
      requestBody.template_id = template;
    }
    
    if (context) {
      requestBody.user_context = context;
    }
    
    // Calculate approximate JSON payload size
    const jsonPayload = JSON.stringify(requestBody);
    const payloadSizeKB = Math.round(jsonPayload.length / 1024);
    
    const urlDomain = imageUrl.hostname;
    const urlPath = imageUrl.pathname;
    
    console.log(`[${timestamp}] [AI Image] Calling Memeputer: ${env.MEMEPUTER_API_BASE}${endpoint}`);
    console.log(`[${timestamp}] [AI Image] Using JSON with base_image_url (no base64 payload)`);
    console.log(`[${timestamp}] [AI Image] Mode: ${customInstructions ? 'custom' : 'auto'}, Template: ${template || 'N/A'}, Has context: ${!!context}`);
    console.log(`[${timestamp}] [AI Image] Prompt length: ${prompt.length}`);
    console.log(`[${timestamp}] [AI Image] Image URL domain: ${urlDomain}`);
    console.log(`[${timestamp}] [AI Image] Image URL path: ${urlPath}`);
    console.log(`[${timestamp}] [AI Image] Image URL length: ${baseImageUrl.length} chars`);
    console.log(`[${timestamp}] [AI Image] Image URL (masked): ${maskUrlForLogging(baseImageUrl)}`);
    console.log(`[${timestamp}] [AI Image] Estimated JSON payload size: ~${payloadSizeKB} KB`);
    console.log(`[${timestamp}] [AI Image] Request body keys:`, Object.keys(requestBody));
    
    const response = await client.post(
      endpoint,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    // Parse response - Agent returns JSON job spec: { type: "image_sticker", engine: "memeputer_i2i", prompt: "...", ... }
    // OR { needs: [...] } if something is missing
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
    
    console.log(`[${timestamp}] [AI Image] Memeputer response status: ${response.status}`);
    console.log(`[${timestamp}] [AI Image] Memeputer response:`, {
      hasData: !!responseData,
      type: responseData?.type,
      engine: responseData?.engine,
      hasNeeds: !!responseData?.needs,
      hasImageUrl: !!(responseData?.image_url || responseData?.image),
      hasPrompt: !!responseData?.prompt,
      responseKeys: responseData ? Object.keys(responseData) : [],
      responsePreview: JSON.stringify(responseData).substring(0, 1000),
    });
    
    if (responseData?.needs) {
      throw new Error(`Memeputer needs additional information: ${JSON.stringify(responseData.needs)}`);
    }

    // Agent returns job spec with engine: "memeputer_i2i" - we need to handle this
    // For now, check if we got a job spec or an image URL directly
    if (responseData?.type === 'image_sticker' && responseData?.engine === 'memeputer_i2i') {
      // Agent returned a job spec - this means Memeputer needs to generate the image
      // The job spec contains: prompt, negative_prompt, canvas, etc.
      // We would need to call Memeputer's image generation endpoint with this spec
      // For now, throw a clear error explaining this
      console.error(`[${timestamp}] [AI Image] ❌ Agent returned job spec (engine: ${responseData.engine}), but image generation endpoint integration is not yet implemented`);
      throw new Error('Agent returned image generation job spec, but Memeputer image generation endpoint integration is not yet implemented. This requires calling Memeputer\'s image generation API with the job spec. Job spec received: ' + JSON.stringify(responseData).substring(0, 500));
    }

    // Fallback: check if response contains image URL directly (some agents might return it)
    const imageUrl = responseData?.image_url || responseData?.image;
    if (imageUrl) {
      console.log(`[${timestamp}] [AI Image] ✅ Found image URL in response`);
      // Continue with image download below
    } else if (responseData?.type === 'image_sticker') {
      // Got image_sticker type but no URL and no engine - might be a different format
      console.error(`[${timestamp}] [AI Image] ❌ Got image_sticker type but no image URL or job spec:`, responseData);
      throw new Error('Memeputer returned image_sticker type but no image URL or job spec. Response: ' + JSON.stringify(responseData).substring(0, 500));
    } else {
      console.error(`[${timestamp}] [AI Image] ❌ Unexpected response:`, responseData);
      throw new Error('Memeputer returned unexpected response. Expected image_sticker type or job spec. Response: ' + JSON.stringify(responseData).substring(0, 500));
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
    const responseHeaders = error.response?.headers || {};
    const requestId = responseHeaders['x-request-id'] || responseHeaders['request-id'] || 'N/A';
    
    console.error(`[${errorTimestamp}] [AI Image] ❌ Memeputer generation failed:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      requestId: requestId,
      responseHeaders: Object.keys(responseHeaders),
      responseData: error.response?.data,
    });
    
    // Log full headers for Memeputer support
    console.error(`[${errorTimestamp}] [AI Image] Response headers:`, JSON.stringify(responseHeaders, null, 2));
    
    // Provide helpful error message based on status code
    const status = error.response?.status;
    let errorMessage = `Memeputer sticker generation failed: ${error.message || 'Unknown error'}`;
    
    if (status === 400) {
      errorMessage += ' (Bad Request - The API may not accept base64 images in JSON format. Please check Memeputer documentation for correct image upload format.)';
    } else if (status === 500) {
      errorMessage += ' (Internal Server Error - This appears to be a Memeputer API issue. The server may not support large base64 payloads or may require a different image format. Please contact Memeputer support with the Request ID below.)';
    }
    
    if (requestId !== 'N/A') {
      errorMessage += ` Request ID: ${requestId}`;
    }
    
    // NO FALLBACK - fail clearly
    throw new Error(errorMessage);
  }
}

/**
 * Generate sticker PNGs using Memeputer API
 * Calls Memeputer agent to generate images via webhook
 * @deprecated Use generateSingleSticker for new code
 */
export async function generateStickerPNGs(options: ImageGenerationOptions): Promise<string[]> {
  const { baseImagePath, context, template, count = 1 } = options;
  const timestamp = new Date().toISOString();
  
  // Ensure required values
  const finalCount = count ?? 1;
  const finalTemplate = template ?? 'GM';
  
  console.log(`[${timestamp}] [AI Image] Generating ${finalCount} stickers via Memeputer:`, {
    template: finalTemplate,
    hasContext: !!context,
    baseImage: baseImagePath,
  });

  // Check cache first
  const cacheKey = stickerCache.generateKey(baseImagePath, {
    template: finalTemplate,
    context,
    count: finalCount,
  });
  
  // For multiple stickers, we can't use cache (each is unique)
  // But we can cache the prepared asset
  if (finalCount === 1) {
    const cached = stickerCache.get(cacheKey);
    if (cached && fs.existsSync(cached)) {
      console.log(`[${timestamp}] [AI Image] Using cached sticker: ${cached}`);
      return [cached];
    }
  }

  // Check if Memeputer is configured
  if (!env.MEMEPUTER_API_KEY || !env.MEMEPUTER_AGENT_ID) {
    console.warn(`[${timestamp}] [AI Image] Memeputer not configured, using fallback`);
    return generateFallbackStickers(baseImagePath, finalTemplate, finalCount);
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
    for (let i = 0; i < finalCount; i++) {
      const prompt = buildStickerPrompt(finalTemplate, context, i, finalCount);
      
      console.log(`[${timestamp}] [AI Image] Generating sticker ${i + 1}/${finalCount} via Memeputer`);

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
        const outputPath = getTempFilePath(`ai_sticker_${finalTemplate}_${i}`, 'png');
        fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
        generatedPaths.push(outputPath);

        console.log(`[${timestamp}] [AI Image] ✅ Generated sticker ${i + 1}/${finalCount}: ${outputPath}`);
      } else if (response.data.data && response.data.data[0]?.url) {
        // Alternative response format
        const imageUrl = response.data.data[0].url;
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const outputPath = getTempFilePath(`ai_sticker_${finalTemplate}_${i}`, 'png');
        fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
        generatedPaths.push(outputPath);

        console.log(`[${timestamp}] [AI Image] ✅ Generated sticker ${i + 1}/${finalCount}: ${outputPath}`);
      } else {
        console.error(`[${timestamp}] [AI Image] ❌ No image in response for sticker ${i + 1}/${finalCount}:`, response.data);
      }
    }

    return generatedPaths;
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    const responseHeaders = error.response?.headers || {};
    const requestId = responseHeaders['x-request-id'] || responseHeaders['request-id'] || 'N/A';
    
    console.error(`[${errorTimestamp}] [AI Image] ❌ Memeputer generation failed:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      requestId: requestId,
      responseHeaders: Object.keys(responseHeaders),
      responseData: error.response?.data,
    });
    
    // Log full headers for Memeputer support
    console.error(`[${errorTimestamp}] [AI Image] Response headers:`, JSON.stringify(responseHeaders, null, 2));
    
    // Fallback to simple processing
    console.log(`[${errorTimestamp}] [AI Image] Using fallback generation`);
    return generateFallbackStickers(baseImagePath, finalTemplate, finalCount);
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

