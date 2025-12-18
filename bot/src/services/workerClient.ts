import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { env } from '../env';
import { stickerCache } from './cache';

export interface ConvertResponse {
  output_path: string;
  duration: number;
  kb: number;
  width: number;
  height: number;
  fps: number;
}

export interface BatchConvertResponse {
  items: ConvertResponse[];
}

export interface AIRenderResponse {
  output_path: string;
  duration: number;
  kb: number;
  width: number;
  height: number;
  fps: number;
}

class WorkerClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.WORKER_URL,
      timeout: 300000, // 5 minutes for conversions
    });
  }

  async convert(
    filePath: string,
    preferSeconds: number = 2.8,
    padMode: string = 'transparent'
  ): Promise<ConvertResponse> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('prefer_seconds', preferSeconds.toString());
    formData.append('pad_mode', padMode);

    const response = await this.client.post<ConvertResponse>(
      '/convert',
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    return response.data;
  }

  async batchConvert(filePaths: string[]): Promise<BatchConvertResponse> {
    const formData = new FormData();
    filePaths.forEach((filePath) => {
      formData.append('files[]', fs.createReadStream(filePath));
    });

    const response = await this.client.post<BatchConvertResponse>(
      '/batch_convert',
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    return response.data;
  }

  async aiRender(
    baseImagePath: string,
    blueprintJson: string
  ): Promise<AIRenderResponse> {
    const formData = new FormData();
    formData.append('base_image', fs.createReadStream(baseImagePath));
    formData.append('blueprint_json', blueprintJson);

    const response = await this.client.post<AIRenderResponse>(
      '/ai/render',
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    return response.data;
  }

  async prepareAsset(baseImagePath: string): Promise<{ output_path: string; status: string }> {
    // Check cache first
    const cacheKey = stickerCache.generateKey(baseImagePath, {});
    const cached = stickerCache.get(cacheKey);
    
    if (cached && fs.existsSync(cached)) {
      console.log(`[Worker Client] Using cached asset: ${cached}`);
      return { output_path: cached, status: 'cached' };
    }
    
    const formData = new FormData();
    formData.append('base_image', fs.createReadStream(baseImagePath));

    const response = await this.client.post<{ output_path: string; status: string }>(
      '/sticker/prepare-asset',
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Cache the prepared asset
    if (response.data.output_path && fs.existsSync(response.data.output_path)) {
      stickerCache.set(cacheKey, response.data.output_path);
    }

    return response.data;
  }
}

export const workerClient = new WorkerClient();

