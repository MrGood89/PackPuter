/**
 * Memeputer Video Provider
 * Uses Memeputer AI agent for i2v generation
 */
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import { getTempFilePath } from '../../util/file';
import { env } from '../../env';
import { VideoProvider, VideoGenerationOptions, VideoGenerationResult } from './types';
import { stickerCache } from '../../services/cache';

export class MemeputerVideoProvider implements VideoProvider {
  private client: AxiosInstance;
  private agentId: string;

  constructor() {
    this.agentId = env.MEMEPUTER_AGENT_ID || '';
    if (!env.MEMEPUTER_API_BASE || !env.MEMEPUTER_API_KEY || !this.agentId) {
      console.warn('[MemeputerVideoProvider] Memeputer API not fully configured.');
    }

    this.client = axios.create({
      baseURL: env.MEMEPUTER_API_BASE,
      headers: {
        'x-api-key': env.MEMEPUTER_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 180000, // 3 minutes for video generation
    });
  }

  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    const { baseImagePath, prompt, negativePrompt, templateId, durationSec, fps, camera, motion } = options;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [MemeputerVideoProvider] Generating video:`, {
      template: templateId,
      duration: durationSec,
      fps,
      camera,
      motion,
    });

    if (!this.agentId) {
      throw new Error('Memeputer Agent ID is not configured.');
    }

    // Use stickerCache for caching (file-based cache)
    const cacheKey = stickerCache.generateKey(baseImagePath, {
      template: templateId,
      context: prompt,
    });
    const cachedResult = stickerCache.get(cacheKey);
    if (cachedResult && fs.existsSync(cachedResult)) {
      console.log(`[${timestamp}] [MemeputerVideoProvider] Cache hit for video generation.`);
      return {
        outputPath: cachedResult,
        metadata: {
          duration: durationSec,
          fps: fps,
          width: 512,
          height: 512,
          hasAlpha: false,
          model: 'memeputer',
        },
      };
    }

    try {
      // Read base image as base64
      const imageBuffer = fs.readFileSync(baseImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      const imageMimeType = baseImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Build prompt spec for agent
      const promptSpec = {
        mode: 'i2v',
        duration_s: durationSec,
        fps: fps,
        camera: camera || 'locked',
        motion: motion || 'character-only',
        prompt: prompt,
        negative_prompt: negativePrompt || 'background, scenery, camera movement, extra characters, text artifacts, watermark, logo',
        notes: 'Keep transparent/solid background. Keep character identity and proportions. Single character only. Simple readable action.',
      };

      const requestPayload: any = {
        message: `Generate an animated video sticker based on this prompt spec: ${JSON.stringify(promptSpec)}. The base image is a prepared character asset (transparent background, white outline). Generate a short animation (${durationSec}s) showing the character performing the action described in the prompt. Return video URL or base64.`,
        base_image: `data:${imageMimeType};base64,${imageBase64}`,
        sticker_type: 'video',
        asset_prepared: true,
        prompt_spec: promptSpec,
      };

      console.log(`[${timestamp}] [MemeputerVideoProvider] Calling Memeputer /chat for video generation`);
      const response = await this.client.post(`/v1/agents/${this.agentId}/chat`, requestPayload);

      // Extract video URL from response
      let videoUrl: string | undefined;
      if (response.data.video_url) {
        videoUrl = response.data.video_url;
      } else if (response.data.video) {
        videoUrl = response.data.video;
      } else if (response.data.data && response.data.data[0]?.url) {
        videoUrl = response.data.data[0].url;
      } else if (response.data.data?.response) {
        try {
          const parsedResponse = JSON.parse(response.data.data.response);
          if (parsedResponse.video_url) videoUrl = parsedResponse.video_url;
          else if (parsedResponse.video) videoUrl = parsedResponse.video;
        } catch (e) {
          console.warn(`[${timestamp}] [MemeputerVideoProvider] Could not parse nested JSON response for video URL.`);
        }
      }

      if (videoUrl) {
        // Download video
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
        });

        const outputPath = getTempFilePath('ai_video_raw', 'mp4');
        fs.writeFileSync(outputPath, Buffer.from(videoResponse.data));

        const result: VideoGenerationResult = {
          outputPath,
          metadata: {
            duration: durationSec,
            fps: fps,
            width: 512,
            height: 512,
            hasAlpha: false, // Will be added via matting
            model: 'memeputer',
          },
        };

        // Cache the result
        stickerCache.set(cacheKey, outputPath);
        console.log(`[${timestamp}] [MemeputerVideoProvider] ✅ Generated video: ${outputPath}`);
        return result;
      } else {
        console.error(`[${timestamp}] [MemeputerVideoProvider] ❌ No video URL in response:`, response.data);
        throw new Error('No video URL received from Memeputer.');
      }
    } catch (error: any) {
      console.error(`[${timestamp}] [MemeputerVideoProvider] Video generation failed:`, error.message);
      throw error;
    }
  }
}

