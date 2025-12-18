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
    glow?: boolean;
    shake?: boolean;
    bounce?: boolean;
  };
  // Extended schema for better quality
  style?: {
    fontSize?: number;
    fontWeight?: string;
    textColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    outlineWidth?: number;
  };
  layout?: {
    safeMargin?: number;
    textAnchor?: 'top' | 'center' | 'bottom';
    maxTextWidth?: number;
  };
  timing?: {
    introMs?: number;
    loopMs?: number;
    outroMs?: number;
  };
}

export interface MemeputerRequest {
  template_id: string;
  project_context?: string;
  user_prompt?: string;
  base_image_description?: string; // Optional: description of the base image
  style_preferences?: string; // Optional: style hints
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
  private apiBase: string;
  private apiKey: string;
  private agentId: string;

  constructor() {
    this.apiBase = env.MEMEPUTER_API_BASE || '';
    this.apiKey = env.MEMEPUTER_API_KEY || '';
    this.agentId = env.MEMEPUTER_AGENT_ID || '';

    if (this.apiBase && this.apiKey) {
      this.client = axios.create({
        baseURL: this.apiBase,
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
    }
  }

  async getBlueprint(
    templateId: string,
    projectContext?: string,
    userPrompt?: string
  ): Promise<Blueprint> {
    const timestamp = new Date().toISOString();
    
    if (!this.client) {
      console.warn(`[${timestamp}] [Memeputer] Client not configured, using fallback blueprint for ${templateId}`);
      return defaultBlueprints[templateId] || defaultBlueprints.GM;
    }

    // Build enhanced request with more context for AI agent
    const request: MemeputerRequest = {
      template_id: templateId,
      project_context: projectContext || '',
      user_prompt: userPrompt || '',
      constraints: {
        duration_max_sec: 3.0,
        fps_max: 30,
        transparent_background: true,
        big_readable_text: true,
        loop_friendly: true,
        target_size_kb: 256,
      },
    };

    console.log(`[${timestamp}] [Memeputer] Requesting blueprint from AI agent:`, {
      template_id: templateId,
      has_context: !!projectContext,
      context_length: projectContext?.length || 0,
      endpoint: `${this.apiBase}/api/v1/agents/${this.agentId}/generate`,
    });

    try {
      // Use Memeputer API endpoint for blueprint generation
      const endpoint = `/api/v1/agents/${this.agentId}/generate`;
      const response = await this.client.post<MemeputerResponse>(
        endpoint,
        request,
        {
          timeout: 60000, // 60 seconds for AI generation
        }
      );

      console.log(`[${timestamp}] [Memeputer] Response received:`, {
        has_blueprint: !!response.data.blueprint,
        has_error: !!response.data.error,
        status: response.status,
      });

      if (response.data.blueprint) {
        console.log(`[${timestamp}] [Memeputer] ✅ Using AI-generated blueprint for ${templateId}`);
        console.log(`[${timestamp}] [Memeputer] Blueprint details:`, {
          duration: response.data.blueprint.duration_sec,
          fps: response.data.blueprint.fps,
          has_text: !!response.data.blueprint.text,
          has_motion: !!response.data.blueprint.motion,
          has_effects: !!response.data.blueprint.effects,
        });
        return response.data.blueprint;
      }

      if (response.data.error) {
        console.error(`[${timestamp}] [Memeputer] ❌ AI agent returned error:`, response.data.error);
      } else {
        console.warn(`[${timestamp}] [Memeputer] ⚠️ No blueprint in response, using fallback`);
      }
    } catch (error: any) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] [Memeputer] ❌ Request failed:`, {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      
      // Log if it's a network error vs API error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error(`[${errorTimestamp}] [Memeputer] Network error - agent may be down or unreachable`);
      } else if (error.response) {
        console.error(`[${errorTimestamp}] [Memeputer] API error - agent returned error status`);
      }
    }

    // Fallback to default
    console.warn(`[${timestamp}] [Memeputer] Using fallback blueprint for ${templateId}`);
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

