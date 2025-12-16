# Supabase Setup for PackPuter

PackPuter uses Supabase to store conversion jobs and process them asynchronously, avoiding Telegram's 90-second timeout limit.

## Database Schema

Create the following table in your Supabase project:

```sql
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

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_conversion_jobs_updated_at
  BEFORE UPDATE ON conversion_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Environment Variables

Add to `bot/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How It Works

1. **User sends file** → Bot immediately stores job in Supabase and replies "Processing..."
2. **Background processor** picks up pending jobs every 2 seconds
3. **Job is processed** (download, convert, etc.)
4. **User is notified** when job completes
5. **Jobs expire after 7 days** and are automatically cleaned up

## Benefits

- ✅ No timeout errors (handler returns immediately)
- ✅ Jobs survive bot restarts
- ✅ Can process multiple jobs concurrently
- ✅ Automatic cleanup of old jobs
- ✅ Better error tracking and debugging

## Fallback Mode

If Supabase is not configured, the bot will still work but will process jobs in-memory only (jobs will be lost on restart).

