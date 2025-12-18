/**
 * Sticker Template Definitions
 * Defines rules for each template: text, colors, animation, placement
 */

export interface TemplateDefinition {
  id: string;
  text: {
    content: string;
    maxLength: number;
    uppercase: boolean;
    fontSize: number; // 80-120px
    placement: 'top' | 'center' | 'bottom';
    strokeWidth: number; // 4-8px
  };
  colors?: {
    primary?: string;
    secondary?: string;
    textColor?: string;
  };
  animation?: {
    style: 'bounce' | 'shake' | 'pop' | 'glow' | 'steady';
    intensity: 'low' | 'medium' | 'high';
    effects: string[]; // ['sparkles', 'stars', 'glow', etc.]
  };
  placement?: {
    textAnchor: 'top' | 'center' | 'bottom';
    safeMargin: number; // pixels from edge
  };
}

export const STICKER_TEMPLATES: Record<string, TemplateDefinition> = {
  GM: {
    id: 'GM',
    text: {
      content: 'GM',
      maxLength: 2,
      uppercase: true,
      fontSize: 120,
      placement: 'top',
      strokeWidth: 8,
    },
    colors: {
      primary: '#FFD700', // Gold
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'bounce',
      intensity: 'medium',
      effects: ['sparkles'],
    },
    placement: {
      textAnchor: 'top',
      safeMargin: 20,
    },
  },
  GN: {
    id: 'GN',
    text: {
      content: 'GN',
      maxLength: 2,
      uppercase: true,
      fontSize: 120,
      placement: 'top',
      strokeWidth: 8,
    },
    colors: {
      primary: '#4A90E2', // Blue
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'bounce',
      intensity: 'low',
      effects: ['stars'],
    },
    placement: {
      textAnchor: 'top',
      safeMargin: 20,
    },
  },
  LFG: {
    id: 'LFG',
    text: {
      content: 'LFG',
      maxLength: 3,
      uppercase: true,
      fontSize: 110,
      placement: 'top',
      strokeWidth: 8,
    },
    colors: {
      primary: '#FF6B6B', // Red
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'bounce',
      intensity: 'high',
      effects: ['sparkles', 'shake'],
    },
    placement: {
      textAnchor: 'top',
      safeMargin: 20,
    },
  },
  HIGHER: {
    id: 'HIGHER',
    text: {
      content: 'HIGHER',
      maxLength: 6,
      uppercase: true,
      fontSize: 100,
      placement: 'center',
      strokeWidth: 6,
    },
    colors: {
      primary: '#9B59B6', // Purple
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'glow',
      intensity: 'medium',
      effects: ['glow', 'sparkles'],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
  HODL: {
    id: 'HODL',
    text: {
      content: 'HODL',
      maxLength: 4,
      uppercase: true,
      fontSize: 110,
      placement: 'center',
      strokeWidth: 6,
    },
    colors: {
      primary: '#2ECC71', // Green
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'steady',
      intensity: 'low',
      effects: [],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
  WAGMI: {
    id: 'WAGMI',
    text: {
      content: 'WAGMI',
      maxLength: 5,
      uppercase: true,
      fontSize: 100,
      placement: 'center',
      strokeWidth: 6,
    },
    colors: {
      primary: '#F39C12', // Orange
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'bounce',
      intensity: 'medium',
      effects: ['sparkles'],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
  NGMI: {
    id: 'NGMI',
    text: {
      content: 'NGMI',
      maxLength: 4,
      uppercase: true,
      fontSize: 110,
      placement: 'center',
      strokeWidth: 6,
    },
    colors: {
      primary: '#E74C3C', // Dark Red
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'shake',
      intensity: 'medium',
      effects: [],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
  SER: {
    id: 'SER',
    text: {
      content: 'SER',
      maxLength: 3,
      uppercase: true,
      fontSize: 110,
      placement: 'center',
      strokeWidth: 8,
    },
    colors: {
      primary: '#FFA500', // Orange
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'pop',
      intensity: 'high',
      effects: ['shake'],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
  REKT: {
    id: 'REKT',
    text: {
      content: 'REKT',
      maxLength: 4,
      uppercase: true,
      fontSize: 110,
      placement: 'center',
      strokeWidth: 8,
    },
    colors: {
      primary: '#8B0000', // Dark Red
      textColor: '#FFFFFF',
    },
    animation: {
      style: 'shake',
      intensity: 'high',
      effects: [],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
  ALPHA: {
    id: 'ALPHA',
    text: {
      content: 'ALPHA',
      maxLength: 5,
      uppercase: true,
      fontSize: 100,
      placement: 'center',
      strokeWidth: 6,
    },
    colors: {
      primary: '#FFD700', // Gold
      textColor: '#000000',
    },
    animation: {
      style: 'glow',
      intensity: 'medium',
      effects: ['glow', 'sparkles'],
    },
    placement: {
      textAnchor: 'center',
      safeMargin: 30,
    },
  },
};

/**
 * Get template definition by ID
 */
export function getTemplate(id: string): TemplateDefinition | undefined {
  return STICKER_TEMPLATES[id.toUpperCase()];
}

/**
 * Get all available template IDs
 */
export function getTemplateIds(): string[] {
  return Object.keys(STICKER_TEMPLATES);
}

/**
 * Validate template ID
 */
export function isValidTemplate(id: string): boolean {
  return id.toUpperCase() in STICKER_TEMPLATES;
}

