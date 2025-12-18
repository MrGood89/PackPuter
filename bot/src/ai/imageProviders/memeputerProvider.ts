/**
 * Memeputer Image Provider
 * Implements ImageProvider interface for Memeputer AI
 */
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { getTempFilePath } from '../../util/file';
import { env } from '../../env';
import { ImageProvider, ImageGenerationOptions, GeneratedImage } from './interface';

export class MemeputerImageProvider implements ImageProvider {
  private apiBase: string;
  private apiKey: string;
  private agentId: string;
  private client: any;

  constructor() {
    this.apiBase = env.MEMEPUTER_API_BASE || '';
    this.apiKey = env.MEMEPUTER_API_KEY || '';
    this.agentId = env.MEMEPUTER_AGENT_ID || '';

    if (this.apiBase && this.apiKey) {
      this.client = axios.create({
        baseURL: this.apiBase,
        timeout: 120000, // 2 minutes
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  getName(): string {
    return 'Memeputer';
  }

  isAvailable(): boolean {
    return !!(this.apiBase && this.apiKey && this.agentId && this.client);
  }

  async generateStickerVariant(
    options: ImageGenerationOptions
  ): Promise<GeneratedImage[]> {
    const { baseImagePath, prompt, count = 1, seed } = options;
    const timestamp = new Date().toISOString();

    if (!this.isAvailable()) {
      throw new Error('Memeputer provider not configured');
    }

    const results: GeneratedImage[] = [];

    for (let i = 0; i < count; i++) {
      try {
        console.log(`[${timestamp}] [Memeputer Image] Generating variant ${i + 1}/${count}`);

        // Build request
        const requestData: any = {
          message: `Generate a sticker image: ${prompt}. Requirements: transparent background, single subject, clean composition, 512x512.`,
          sticker_type: 'image',
        };

        // Add base image if provided (img2img mode)
        if (baseImagePath && fs.existsSync(baseImagePath)) {
          const formData = new FormData();
          formData.append('image', fs.createReadStream(baseImagePath));
          formData.append('message', requestData.message);
          formData.append('sticker_type', 'image');
          formData.append('n', '1');
          formData.append('size', '512x512');
          formData.append('response_format', 'url');

          const response = await axios.post(
            `${this.apiBase}/api/v1/agents/${this.agentId}/generate-image`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                'x-api-key': this.apiKey,
              },
              timeout: 90000,
            }
          );

          if (response.data.data && response.data.data[0]?.url) {
            const imageUrl = response.data.data[0].url;
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 30000,
            });

            const outputPath = getTempFilePath(`memeputer_sticker_${i}`, 'png');
            fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
            results.push({ imagePath: outputPath, seed });
          }
        } else {
          // Text-to-image mode (no base image)
          const response = await this.client.post(
            `/v1/agents/${this.agentId}/chat`,
            requestData,
            { timeout: 90000 }
          );

          // Parse response (similar to blueprint parsing)
          let imageUrl: string | undefined;
          if (response.data?.data?.response) {
            const responseStr = response.data.data.response;
            const parsed = typeof responseStr === 'string' ? JSON.parse(responseStr) : responseStr;
            imageUrl = parsed.image_url || parsed.url;
          }

          if (imageUrl) {
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 30000,
            });

            const outputPath = getTempFilePath(`memeputer_sticker_${i}`, 'png');
            fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
            results.push({ imagePath: outputPath, seed });
          }
        }
      } catch (error: any) {
        console.error(`[${timestamp}] [Memeputer Image] Failed to generate variant ${i + 1}:`, error.message);
        // Continue with other variants
      }
    }

    return results;
  }
}

