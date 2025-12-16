import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { env } from '../env';

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
}

export const workerClient = new WorkerClient();

