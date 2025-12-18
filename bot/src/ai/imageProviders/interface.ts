/**
 * Image Provider Interface
 * Modular interface for different AI image generation providers
 */

export interface ImageGenerationOptions {
  baseImagePath?: string; // Optional base image for img2img
  prompt: string;
  seed?: number;
  steps?: number;
  aspect?: 'square' | 'portrait' | 'landscape';
  count?: number; // Number of variations to generate
}

export interface GeneratedImage {
  imagePath: string; // Path to generated image file
  seed?: number;
  metadata?: Record<string, any>;
}

export interface ImageProvider {
  /**
   * Generate sticker variant(s) from base image and prompt
   */
  generateStickerVariant(
    options: ImageGenerationOptions
  ): Promise<GeneratedImage[]>;
  
  /**
   * Check if provider is available/configured
   */
  isAvailable(): boolean;
  
  /**
   * Get provider name
   */
  getName(): string;
}

