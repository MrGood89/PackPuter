import dotenv from 'dotenv';

dotenv.config();

export const env = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  BOT_USERNAME: process.env.BOT_USERNAME || 'PackPuterBot',
  WORKER_URL: process.env.WORKER_URL || 'http://worker:8000',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  MEMEPUTER_AGENT_URL: process.env.MEMEPUTER_AGENT_URL || '',
  MEMEPUTER_AGENT_SECRET: process.env.MEMEPUTER_AGENT_SECRET || '',
};

if (!env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

