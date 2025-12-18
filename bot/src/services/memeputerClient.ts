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
          'x-api-key': this.apiKey, // Memeputer uses x-api-key header
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async getBlueprint(
    templateId: string,
    projectContext?: string,
    userPrompt?: string,
    baseImagePath?: string // Optional base image path for agent
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
      // Memeputer API endpoint - /v1/agents/{id}/chat
      const endpoint = `/v1/agents/${this.agentId}/chat`;
      
      // Memeputer agent expects: base_image, sticker_type, and message
      // Format request according to agent's expected format
      const chatRequest: any = {
        message: `Generate a sticker blueprint JSON for template "${templateId}". ${projectContext ? `Context: ${projectContext}` : ''} Constraints: ${JSON.stringify(request.constraints)}. Return only valid JSON blueprint with duration_sec, fps, text, motion, and effects fields.`,
        sticker_type: 'video', // Video stickers for animated blueprints
      };
      
      // Include base_image if provided (agent needs it)
      // The agent expects base_image as a URL or filename
      // Since we have a local file path, we'll try sending it
      if (baseImagePath) {
        // Extract filename from path for agent
        const filename = baseImagePath.split('/').pop() || baseImagePath;
        chatRequest.base_image = filename; // Try sending filename first
        // Also mention in message for context
        chatRequest.message += ` Base image is available: ${filename}`;
        console.log(`[${timestamp}] [Memeputer] Including base_image: ${filename}`);
      } else {
        console.log(`[${timestamp}] [Memeputer] No base_image provided - agent may ask for it`);
      }
      
      console.log(`[${timestamp}] [Memeputer] Calling endpoint: ${this.apiBase}${endpoint}`);
      console.log(`[${timestamp}] [Memeputer] Request:`, {
        template: templateId,
        has_context: !!projectContext,
        sticker_type: chatRequest.sticker_type,
      });
      
      const response = await this.client.post<any>(
        endpoint,
        chatRequest,
        {
          timeout: 60000, // 60 seconds for AI generation
        }
      );
      
      console.log(`[${timestamp}] [Memeputer] Response received:`, {
        status: response.status,
        has_data: !!response.data,
        data_keys: response.data ? Object.keys(response.data) : [],
      });
      
      // Memeputer returns: { data: { response: "JSON string", model: "...", temperature: ... } }
      // The "response" field contains a JSON string that needs to be parsed
      let agentResponse: any = null;
      
      // Parse response structure: response.data.data.response (nested JSON string)
      if (response.data?.data?.response) {
        // Parse the nested JSON string
        try {
          const responseStr = response.data.data.response;
          agentResponse = typeof responseStr === 'string' ? JSON.parse(responseStr) : responseStr;
          console.log(`[${timestamp}] [Memeputer] Parsed agent response from data.data.response:`, {
            keys: Object.keys(agentResponse),
            has_needs: !!agentResponse.needs,
            has_blueprint: !!agentResponse.blueprint,
            has_duration: !!agentResponse.duration_sec,
            full_response: JSON.stringify(agentResponse).substring(0, 500), // Log first 500 chars
          });
        } catch (e) {
          console.warn(`[${timestamp}] [Memeputer] Failed to parse response.data.data.response:`, e);
          console.warn(`[${timestamp}] [Memeputer] Raw response string:`, response.data.data.response?.substring(0, 500));
        }
      } else if (response.data?.response) {
        // Try direct response field (fallback)
        try {
          agentResponse = typeof response.data.response === 'string' 
            ? JSON.parse(response.data.response)
            : response.data.response;
          console.log(`[${timestamp}] [Memeputer] Parsed agent response from data.response`);
        } catch (e) {
          agentResponse = response.data.response;
        }
      } else {
        console.warn(`[${timestamp}] [Memeputer] No response field found in:`, Object.keys(response.data || {}));
      }
      
      // Check if agent is asking for more parameters
      if (agentResponse?.needs) {
        console.warn(`[${timestamp}] [Memeputer] ⚠️ Agent needs more parameters:`, agentResponse.needs);
        console.warn(`[${timestamp}] [Memeputer] Hint:`, agentResponse.hint);
        
        // If agent needs base_image and we have it, make a follow-up request
        if (agentResponse.needs.includes('base_image') && baseImagePath) {
          console.log(`[${timestamp}] [Memeputer] Making follow-up request with base_image...`);
          
          // Try follow-up request with base_image
          const followUpRequest: any = {
            message: `Generate a sticker blueprint JSON for template "${templateId}". ${projectContext ? `Context: ${projectContext}` : ''} Constraints: ${JSON.stringify(request.constraints)}. Return only valid JSON blueprint with duration_sec, fps, text, motion, and effects fields.`,
            sticker_type: 'video',
            base_image: baseImagePath, // Try sending full path
          };
          
          try {
            const followUpResponse = await this.client.post<any>(
              endpoint,
              followUpRequest,
              { timeout: 60000 }
            );
            
            if (followUpResponse.data?.data?.response) {
              const followUpStr = followUpResponse.data.data.response;
              const followUpParsed = typeof followUpStr === 'string' ? JSON.parse(followUpStr) : followUpStr;
              
              console.log(`[${timestamp}] [Memeputer] Follow-up response:`, {
                keys: Object.keys(followUpParsed),
                has_blueprint: !!followUpParsed.blueprint,
                has_duration: !!followUpParsed.duration_sec,
              });
              
              // Check if follow-up has blueprint
              if (followUpParsed.blueprint || followUpParsed.duration_sec) {
                agentResponse = followUpParsed;
              }
            }
          } catch (followUpError: any) {
            console.warn(`[${timestamp}] [Memeputer] Follow-up request failed:`, followUpError.message);
          }
        }
      }
      
      // Try to extract blueprint from response
      let blueprint: Blueprint | undefined;
      
      if (agentResponse?.blueprint) {
        blueprint = agentResponse.blueprint;
      } else if (agentResponse?.duration_sec) {
        // The response itself might be the blueprint
        blueprint = agentResponse as Blueprint;
      } else if (response.data?.blueprint) {
        blueprint = response.data.blueprint;
      } else if (response.data?.data?.blueprint) {
        blueprint = response.data.data.blueprint;
      }
      
      if (blueprint) {
        console.log(`[${timestamp}] [Memeputer] ✅ Using AI-generated blueprint for ${templateId}`);
        console.log(`[${timestamp}] [Memeputer] Blueprint details:`, {
          duration: blueprint.duration_sec,
          fps: blueprint.fps,
          has_text: !!blueprint.text,
          has_motion: !!blueprint.motion,
          has_effects: !!blueprint.effects,
        });
        return blueprint;
      }
      
      // If no blueprint found, check for error
      if (response.data?.error || agentResponse?.error) {
        console.error(`[${timestamp}] [Memeputer] ❌ AI agent returned error:`, response.data?.error || agentResponse?.error);
      } else {
        console.warn(`[${timestamp}] [Memeputer] ⚠️ No blueprint in response, using fallback`);
        if (agentResponse) {
          console.warn(`[${timestamp}] [Memeputer] Agent response keys:`, Object.keys(agentResponse));
        }
      }

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

