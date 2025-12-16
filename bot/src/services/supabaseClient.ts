import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase not configured. Jobs will be processed in-memory only.');
    return null;
  }

  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  return client;
}

export interface ConversionJob {
  id?: string;
  user_id: number;
  chat_id: number;
  job_type: 'convert' | 'batch' | 'ai_render' | 'ai_pack';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_id?: string;
  file_path?: string;
  metadata?: any;
  error?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}

export async function createJob(job: Omit<ConversionJob, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // Fallback: return a fake ID for in-memory processing
    return `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  const { data, error } = await supabase
    .from('conversion_jobs')
    .insert({
      ...job,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create job:', error);
    return null;
  }

  return data.id;
}

export async function updateJobStatus(
  jobId: string,
  status: ConversionJob['status'],
  metadata?: any,
  error?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return true; // In-memory mode, assume success
  }

  const update: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (metadata) {
    update.metadata = metadata;
  }

  if (error) {
    update.error = error;
  }

  const { error: updateError } = await supabase
    .from('conversion_jobs')
    .update(update)
    .eq('id', jobId);

  if (updateError) {
    console.error('Failed to update job:', updateError);
    return false;
  }

  return true;
}

export async function getPendingJobs(limit: number = 10): Promise<ConversionJob[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('conversion_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to get pending jobs:', error);
    return [];
  }

  return data || [];
}

export async function cleanupExpiredJobs(): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return 0;
  }

  const { error } = await supabase
    .from('conversion_jobs')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Failed to cleanup expired jobs:', error);
    return 0;
  }

  // Delete doesn't return count, so we return 1 to indicate success
  return 1;
}

