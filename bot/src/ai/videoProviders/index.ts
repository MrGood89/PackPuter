/**
 * Video Provider Factory
 * Selects provider based on environment variable
 */
import { VideoProvider, VideoGenerationOptions, VideoGenerationResult } from './types';
import { MemeputerVideoProvider } from './memeputerProvider';

const VIDEO_PROVIDER = process.env.VIDEO_PROVIDER || 'memeputer';

let providerInstance: VideoProvider | null = null;

function getProvider(): VideoProvider {
  if (providerInstance) {
    return providerInstance;
  }

  switch (VIDEO_PROVIDER.toLowerCase()) {
    case 'memeputer':
      providerInstance = new MemeputerVideoProvider();
      break;
    default:
      console.warn(`[VideoProvider] Unknown provider: ${VIDEO_PROVIDER}, using memeputer`);
      providerInstance = new MemeputerVideoProvider();
  }

  return providerInstance;
}

export async function generateVideo(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const provider = getProvider();
  return provider.generateVideo(options);
}

export { VideoProvider, VideoGenerationOptions, VideoGenerationResult };

