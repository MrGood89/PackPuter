/**
 * Video Provider Interface
 * For AI image-to-video (i2v) generation
 */

export interface VideoGenerationOptions {
  baseImagePath: string; // Path to prepared asset (512x512, transparent, outlined)
  prompt: string; // Animation prompt
  negativePrompt?: string; // What to avoid
  templateId: string; // Template ID (GM, GN, LFG, etc.)
  durationSec: number; // Target duration (2-3 seconds)
  fps: number; // Target FPS (24-30)
  camera?: 'locked' | 'slight-pan' | 'zoom'; // Camera movement
  motion?: 'character-only' | 'full-scene'; // Motion type
  seed?: number; // For reproducibility
}

export interface VideoGenerationResult {
  outputPath: string; // Path to generated video file
  metadata?: {
    duration: number;
    fps: number;
    width: number;
    height: number;
    hasAlpha?: boolean; // Most i2v models don't have alpha
    model?: string;
    seed?: number;
  };
}

export interface VideoProvider {
  /**
   * Generate video from image and prompt.
   * Returns video file path (usually MP4/WebM with background).
   * Alpha channel will be added via matting in post-processing.
   */
  generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult>;
}

