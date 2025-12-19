# Rebuilding the Bot After Code Changes

## Problem
The bot code is compiled TypeScript. When you make changes to `bot/src/`, they need to be recompiled and the Docker image needs to be rebuilt.

## Solution

### Option 1: Rebuild and Restart (Recommended)
```bash
cd /srv/PackPuter
docker-compose down
docker-compose build bot
docker-compose up -d
```

### Option 2: Rebuild All Services
```bash
cd /srv/PackPuter
docker-compose down
docker-compose build
docker-compose up -d
```

### Option 3: One-Line Rebuild
```bash
cd /srv/PackPuter && docker-compose down && docker-compose build bot && docker-compose up -d
```

## Why This Is Needed

1. The Dockerfile runs `npm run build` which compiles TypeScript (`src/`) to JavaScript (`dist/`)
2. The container runs `node dist/index.js` (the compiled code)
3. The volume mount `./bot/src:/app/src` only syncs source files, not the compiled output
4. Therefore, code changes require rebuilding the image to recompile

## Verify Changes

After rebuilding, check the logs to see your new console.log statements:
```bash
docker-compose logs --tail=50 -f bot
```

You should see logs like:
- `[Bot] ===== MODULE LOADING START =====`
- `[Bot Startup] Registering AI Image Flow...`
- `[AI Image Flow] ===== SETUP START =====`

