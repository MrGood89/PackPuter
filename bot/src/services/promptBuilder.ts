/**
 * Prompt Builder for AI Video Generation
 * Builds prompts for i2v models based on templates and context
 */
import { getTemplate } from '../ai/templates/stickers';

export interface PromptSpec {
  mode: 'i2v';
  duration_s: number;
  fps: number;
  camera: 'locked' | 'slight-pan' | 'zoom';
  motion: 'character-only' | 'full-scene';
  prompt: string;
  negative_prompt: string;
  notes: string;
}

export function buildPromptSpec(
  templateId: string,
  context?: string,
  baseImageDescription?: string
): PromptSpec {
  const template = getTemplate(templateId);
  
  // Template-specific action prompts
  const actionPrompts: Record<string, string> = {
    'GM': 'waving hello with a friendly smile, energetic and positive',
    'GN': 'waving goodnight with a calm, peaceful expression',
    'LFG': 'pumping fist in the air with excitement, highly enthusiastic',
    'HIGHER': 'pointing upward with both hands, celebrating upward trend',
    'HODL': 'holding up a sign or making a "hold" gesture, determined expression',
    'WAGMI': 'giving thumbs up with optimistic smile, community-focused',
    'NGMI': 'shaking head with disappointed expression, ironic',
    'SER': 'making a respectful salute or bow gesture',
    'REKT': 'looking defeated with hands on head, showing heavy losses',
    'ALPHA': 'striking a confident pose, showing exclusivity and value',
  };
  
  const action = actionPrompts[templateId] || 'performing a simple, clear gesture';
  
  // Build main prompt
  let prompt = `Animate the same character from the reference image ${action}. `;
  prompt += `Keep the character's identity, face, and outfit exactly the same. `;
  prompt += `Single character only, no background, locked camera. `;
  prompt += `Simple, readable action that works at small sticker size. `;
  
  if (context) {
    prompt += `Context: ${context}. `;
  }
  
  if (template?.animation?.style) {
    prompt += `Animation style: ${template.animation.style}. `;
  }
  
  // Negative prompt
  const negativePrompt = [
    'background',
    'scenery',
    'landscape',
    'camera movement',
    'panning',
    'zooming',
    'extra characters',
    'multiple people',
    'text artifacts',
    'watermark',
    'logo',
    'complex scene',
    'cluttered',
    'busy background',
  ].join(', ');
  
  return {
    mode: 'i2v',
    duration_s: 2.6,
    fps: 24,
    camera: 'locked',
    motion: 'character-only',
    prompt: prompt.trim(),
    negative_prompt: negativePrompt,
    notes: 'Keep transparent/solid background. Keep character identity and proportions. Single character only. Simple readable action.',
  };
}

