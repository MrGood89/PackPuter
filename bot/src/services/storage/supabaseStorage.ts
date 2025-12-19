import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import { env } from '../../env';

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'sticker-assets';
const SIGNED_URL_TTL = parseInt(process.env.SUPABASE_STORAGE_SIGNED_TTL_SECONDS || '1800', 10); // 30 min default

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    }
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

/**
 * Upload a local file to Supabase Storage and return a signed URL
 * @param localPath Path to the local file to upload
 * @param key Storage key (path) in the bucket (e.g., "memeputer/user123/session456/1234567890_asset.png")
 * @returns Signed URL that's publicly accessible for the TTL duration
 */
export async function uploadAndGetSignedUrl(localPath: string, key: string): Promise<string> {
  const timestamp = new Date().toISOString();
  
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }
  
  const fileBuffer = fs.readFileSync(localPath);
  const fileStats = fs.statSync(localPath);
  
  console.log(`[${timestamp}] [Supabase Storage] Uploading file: ${localPath} (${fileStats.size} bytes) to key: ${key}`);
  
  const supabase = getSupabaseClient();
  
  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, fileBuffer, {
      contentType: 'image/png',
      upsert: true, // Overwrite if exists
    });
  
  if (uploadError) {
    console.error(`[${timestamp}] [Supabase Storage] Upload failed:`, uploadError);
    throw new Error(`Failed to upload file to Supabase Storage: ${uploadError.message}`);
  }
  
  console.log(`[${timestamp}] [Supabase Storage] ✅ Upload successful: ${uploadData.path}`);
  
  // Generate signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(key, SIGNED_URL_TTL);
  
  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error(`[${timestamp}] [Supabase Storage] Signed URL generation failed:`, signedUrlError);
    throw new Error(`Failed to generate signed URL: ${signedUrlError?.message || 'Unknown error'}`);
  }
  
  const signedUrl = signedUrlData.signedUrl;
  const urlDomain = new URL(signedUrl).hostname;
  
  console.log(`[${timestamp}] [Supabase Storage] ✅ Signed URL generated (TTL: ${SIGNED_URL_TTL}s)`);
  console.log(`[${timestamp}] [Supabase Storage] URL domain: ${urlDomain}`);
  console.log(`[${timestamp}] [Supabase Storage] URL length: ${signedUrl.length} chars`);
  console.log(`[${timestamp}] [Supabase Storage] URL (masked): ${maskUrlForLogging(signedUrl)}`);
  
  return signedUrl;
}

/**
 * Mask URL query parameters for safe logging (keeps domain and path visible)
 */
function maskUrlForLogging(url: string): string {
  try {
    const urlObj = new URL(url);
    // Mask token/signature in query params
    const maskedSearch = urlObj.search.replace(/token=[^&]*/gi, 'token=***').replace(/signature=[^&]*/gi, 'signature=***');
    return `${urlObj.origin}${urlObj.pathname}${maskedSearch}`;
  } catch {
    return url.substring(0, 50) + '...';
  }
}

/**
 * Generate a unique storage key for an asset
 * Format: memeputer/{userId}/{sessionId}/{timestamp}_asset.png
 */
export function generateAssetKey(userId: number, sessionId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `memeputer/${userId}/${sessionId}/${ts}_asset.png`;
}

