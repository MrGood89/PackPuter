# PackPuter - Project Status Summary

## 📋 What We Have

### Project Structure
```
PackPuter/
├── bot/                    # Node.js + TypeScript Telegram bot
│   ├── src/
│   │   ├── index.ts        # Main bot entry point
│   │   ├── env.ts          # Environment variables
│   │   ├── services/       # External service clients
│   │   │   ├── workerClient.ts      # FastAPI worker client
│   │   │   ├── memeputerClient.ts   # Memeputer AI agent client
│   │   │   ├── supabaseClient.ts    # Supabase job queue client
│   │   │   └── jobProcessor.ts      # Background job processor
│   │   ├── telegram/       # Telegram bot handlers
│   │   │   ├── flows_batch.ts       # Batch conversion flow
│   │   │   ├── flows_convert.ts    # Single file conversion
│   │   │   ├── flows_ai.ts         # AI sticker generation
│   │   │   ├── packs.ts            # Sticker pack management
│   │   │   ├── sessions.ts         # User session management
│   │   │   └── menus.ts            # Keyboard menus (being removed)
│   │   └── util/           # Utility functions
│   │       ├── file.ts      # File handling
│   │       ├── slug.ts      # URL slug generation
│   │       └── validate.ts # File validation
│   ├── Dockerfile
│   └── package.json
│
├── worker/                 # Python FastAPI worker service
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── convert.py     # Single file conversion
│   │   ├── batch.py       # Batch conversion
│   │   ├── sizefit.py     # Size-fitting algorithm (critical)
│   │   ├── render.py       # AI sticker rendering
│   │   ├── blueprint.py    # Blueprint schema
│   │   └── ffmpeg_utils.py # FFmpeg helpers
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml      # Orchestration
└── docs/                   # Documentation
    ├── SUPABASE_SETUP.md
    └── supabase_migration.sql
```

## 🏗️ How It's Built

### Architecture

**Two-Service Docker Compose Setup:**

1. **Bot Service (Node.js + Telegraf)**
   - Handles Telegram interactions
   - Manages user sessions (in-memory)
   - Creates jobs in Supabase queue
   - Background job processor handles long-running tasks
   - Communicates with worker via HTTP

2. **Worker Service (Python + FastAPI)**
   - Handles video conversion (FFmpeg)
   - Implements size-fitting algorithm
   - Renders AI-generated stickers
   - Returns converted files via shared Docker volume

**Shared Volume:**
- `/tmp/packputer` - Shared between bot and worker containers
- All temporary files stored here for inter-container access

**Job Queue (Supabase):**
- `conversion_jobs` table stores async job states
- Prevents Telegram handler timeouts
- Background processor polls and processes jobs

### Technology Stack

**Bot:**
- Node.js 20 (Alpine)
- TypeScript
- Telegraf 4.15.0 (Telegram bot framework)
- Axios (HTTP client)
- Supabase JS (job queue)

**Worker:**
- Python 3.11 (Slim)
- FastAPI 0.104.1
- FFmpeg (video conversion)
- Pillow (image processing)
- NumPy (animation rendering)

### Key Features

1. **Batch Convert (≤10 files)**
   - User sends up to 10 GIFs/videos
   - Each converted to Telegram-compliant WEBM VP9
   - Auto-proceeds after 3 seconds if no new files
   - Creates sticker pack or adds to existing

2. **Single Convert**
   - One file at a time
   - Returns converted sticker immediately

3. **AI Sticker Maker**
   - Base image + project context + template
   - Calls Memeputer AI agent for blueprint
   - Procedurally renders animation
   - Converts to compliant sticker

4. **AI Generate Pack**
   - Generates 6 or 12 stickers
   - Themes: degen, wholesome, builder
   - Creates full sticker pack automatically

## 🚦 Current State

### ✅ What's Working

1. **Core Architecture**
   - Docker Compose setup functional
   - Bot and worker services communicate
   - Shared volume working
   - Job queue infrastructure in place

2. **Commands Registered**
   - `/start` - Welcome message
   - `/batch` - Start batch conversion
   - `/convert` - Single file conversion
   - `/ai` - AI sticker maker
   - `/pack` - AI pack generation
   - `/done` - Finish batch
   - `/help` - Help information

3. **File Processing**
   - File uploads received
   - Worker conversion pipeline functional
   - Size-fitting algorithm implemented
   - Telegram compliance enforced

### ❌ Current Issues

1. **Keyboard Buttons Still Showing**
   - **Problem:** Telegram still displays button keyboards despite code changes
   - **Root Cause:** 
     - Some replies still use `{ reply_markup: { remove_keyboard: true } }` instead of `REPLY_OPTIONS`
     - TypeScript compilation errors preventing deployment
     - Telegram may cache keyboards from previous messages
   
   **Files with remaining issues:**
   - `bot/src/index.ts` - Lines 77, 83, 111, 119, 138
   - `bot/src/telegram/flows_ai.ts` - Lines 29, 110

2. **TypeScript Build Errors**
   - `remove_keyboard: true` needs to be literal type `true`, not `boolean`
   - Solution: Use `Markup.removeKeyboard()` which returns correct type
   - **Status:** Fixed in `menus.ts`, but not yet deployed

3. **Timeout Errors**
   - Some operations still timing out (90 seconds)
   - Job processor should handle this, but may not be processing all jobs

4. **Sticker Set Error**
   - `getMyStickerSets()` trying to call `getStickerSet('')` with empty string
   - **Status:** Fixed to return empty array, but old code may still be running

### 🔧 What Needs to Be Fixed

1. **Replace all keyboard removal instances:**
   ```typescript
   // Change from:
   { reply_markup: { remove_keyboard: true } }
   
   // To:
   REPLY_OPTIONS  // (which is Markup.removeKeyboard())
   ```

2. **Files to update:**
   - `bot/src/index.ts` - 5 instances
   - `bot/src/telegram/flows_ai.ts` - 2 instances

3. **Deploy and test:**
   - Build must succeed (TypeScript compilation)
   - Restart bot container
   - Test with `/start` command
   - Verify no buttons appear

## 📊 Deployment Status

### Current Deployment
- **Location:** `/srv/PackPuter/` on VM
- **Status:** Running but showing old behavior
- **Last Build:** Failed due to TypeScript errors
- **Last Successful Deploy:** Unknown (buttons still showing)

### Environment Variables Required

**Bot (`bot/.env`):**
```
TELEGRAM_BOT_TOKEN=...
BOT_USERNAME=PackPuterBot
WORKER_URL=http://worker:8000
SUPABASE_URL=... (optional)
SUPABASE_SERVICE_ROLE_KEY=... (optional)
MEMEPUTER_AGENT_URL=...
MEMEPUTER_AGENT_SECRET=...
```

**Worker (`worker/.env`):**
```
MAX_STICKER_KB=256
MAX_SECONDS=3.0
MAX_FPS=30
TARGET_SIDE=512
```

## 🎯 Next Steps

1. **Fix remaining keyboard removal instances**
   - Update `index.ts` and `flows_ai.ts` to use `REPLY_OPTIONS`
   - Ensure TypeScript compiles successfully

2. **Deploy to VM**
   ```bash
   cd /srv/PackPuter
   git pull
   docker-compose build bot
   docker-compose restart bot
   ```

3. **Test thoroughly**
   - Send `/start` - should see text only, no buttons
   - Test `/batch` command
   - Verify file uploads work
   - Check pack creation

4. **Monitor logs**
   ```bash
   docker-compose logs -f bot
   ```

## 📝 Notes

- **Telegram Keyboard Caching:** If buttons persist after fix, user may need to:
  - Close and reopen Telegram chat
  - Send `/start` again to trigger fresh message
  - Clear Telegram cache (if possible)

- **Job Queue:** Supabase is optional - if not configured, bot falls back to in-memory processing

- **File Sharing:** All temporary files must be in `/tmp/packputer` (shared volume) for bot and worker to access

- **Compliance:** All stickers must meet Telegram's strict requirements (WEBM VP9, ≤3s, ≤30fps, 512px, ≤256KB)

