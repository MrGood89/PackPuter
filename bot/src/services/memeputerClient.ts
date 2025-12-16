import axios, { AxiosInstance } from 'axios';
import { env } from '../env';

export interface Blueprint {
  duration_sec: number;
  fps: number;
  loop: boolean;
  text?: {
    value: string;
    subvalue?: string;
    placement: 'top' | 'center' | 'bottom';
    stroke: boolean;
  };
  motion?: {
    type: 'bounce' | 'shake' | 'none';
    amplitude_px?: number;
    period_sec?: number;
  };
  face?: {
    blink: boolean;
    blink_every_sec?: number;
  };
  effects?: {
    sparkles?: boolean;
    sparkle_count?: number;
    stars?: boolean;
  };
}

export interface MemeputerRequest {
  template_id: string;
  project_context?: string;
  user_prompt?: string;
  constraints: {
    duration_max_sec: number;
    fps_max: number;
    transparent_background: boolean;
    big_readable_text: boolean;
    loop_friendly: boolean;
    target_size_kb: number;
  };
}

export interface MemeputerResponse {
  blueprint?: Blueprint;
  blueprints?: Blueprint[];
  error?: string;
}

// Default blueprints for fallback
const defaultBlueprints: Record<string, Blueprint> = {
  GM: {
    duration_sec: 2.6,
    fps: 20,
    loop: true,
    text: {
      value: 'GM',
      subvalue: '$JOBS',
      placement: 'top',
      stroke: true,
    },
    motion: {
      type: 'bounce',
      amplitude_px: 10,
      period_sec: 1.3,
    },
    face: {
      blink: true,
      blink_every_sec: 2.0,
    },
    effects: {
      sparkles: true,
      sparkle_count: 6,
    },
  },
  LFG: {
    duration_sec: 2.5,
    fps: 24,
    loop: true,
    text: {
      value: 'LFG',
      placement: 'center',
      stroke: true,
    },
    motion: {
      type: 'bounce',
      amplitude_px: 15,
      period_sec: 1.0,
    },
  },
  GN: {
    duration_sec: 2.8,
    fps: 20,
    loop: true,
    text: {
      value: 'GN',
      placement: 'bottom',
      stroke: true,
    },
    motion: {
      type: 'bounce',
      amplitude_px: 8,
      period_sec: 1.5,
    },
    effects: {
      stars: true,
    },
  },
  HODL: {
    duration_sec: 2.6,
    fps: 20,
    loop: true,
    text: {
      value: 'HODL',
      placement: 'center',
      stroke: true,
    },
    motion: {
      type: 'bounce',
      amplitude_px: 12,
      period_sec: 1.2,
    },
  },
};

class MemeputerClient {
  private client: AxiosInstance | null = null;
  private agentUrl: string;
  private agentSecret: string;

  constructor() {
    this.agentUrl = env.MEMEPUTER_AGENT_URL || '';
    this.agentSecret = env.MEMEPUTER_AGENT_SECRET || '';

    if (this.agentUrl) {
      this.client = axios.create({
        baseURL: this.agentUrl,
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${this.agentSecret}`,
        },
      });
    }
  }

  async getBlueprint(
    templateId: string,
    projectContext?: string,
    userPrompt?: string
  ): Promise<Blueprint> {
    if (!this.client) {
      // Fallback to default blueprint
      return defaultBlueprints[templateId] || defaultBlueprints.GM;
    }

    const request: MemeputerRequest = {
      template_id: templateId,
      project_context: projectContext,
      user_prompt: userPrompt,
      constraints: {
        duration_max_sec: 3.0,
        fps_max: 30,
        transparent_background: true,
        big_readable_text: true,
        loop_friendly: true,
        target_size_kb: 256,
      },
    };

    try {
      const response = await this.client.post<MemeputerResponse>(
        '/generate',
        request
      );

      if (response.data.blueprint) {
        return response.data.blueprint;
      }

      if (response.data.error) {
        console.error('Memeputer error:', response.data.error);
      }
    } catch (error) {
      console.error('Memeputer request failed:', error);
    }

    // Fallback to default
    return defaultBlueprints[templateId] || defaultBlueprints.GM;
  }

  async getBlueprints(
    count: number,
    templateId: string,
    projectContext?: string,
    theme?: string
  ): Promise<Blueprint[]> {
    // For MVP, generate variations of the base template
    const base = await this.getBlueprint(templateId, projectContext);
    const blueprints: Blueprint[] = [];

    for (let i = 0; i < count; i++) {
      const variation: Blueprint = {
        ...base,
        text: {
          ...base.text!,
          value: base.text?.value || 'GM',
        },
        motion: {
          type: base.motion?.type || 'bounce',
          amplitude_px: (base.motion?.amplitude_px || 10) + (i % 3) * 2,
          period_sec: base.motion?.period_sec,
        },
      };
      blueprints.push(variation);
    }

    return blueprints;
  }
}

export const memeputerClient = new MemeputerClient();

