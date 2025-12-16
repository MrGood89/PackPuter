-- PackPuter Supabase Migration
-- Run this in your Supabase SQL editor

-- Create conversion_jobs table
CREATE TABLE IF NOT EXISTS conversion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('convert', 'batch', 'ai_render', 'ai_pack')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_id TEXT,
  file_path TEXT,
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status ON conversion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_user_id ON conversion_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_expires_at ON conversion_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_created_at ON conversion_jobs(created_at);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_conversion_jobs_updated_at ON conversion_jobs;
CREATE TRIGGER update_conversion_jobs_updated_at
  BEFORE UPDATE ON conversion_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE conversion_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage all jobs"
  ON conversion_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

