# Debug Pack Creation Issues

## Check Bot Logs for Pack Creation Errors

### View recent bot logs (last 100 lines):
```bash
cd /srv/PackPuter
docker-compose logs --tail=100 bot
```

### View all bot logs:
```bash
docker-compose logs bot
```

### Follow logs in real-time (while testing):
```bash
docker-compose logs -f bot
```

### Search for specific errors:
```bash
docker-compose logs bot | grep -i error
docker-compose logs bot | grep -i "pack"
docker-compose logs bot | grep -i "sticker"
docker-compose logs bot | grep -i "failed"
```

## Common Pack Creation Errors

### 1. Telegram API Errors
Look for:
- `Failed to create sticker set`
- `Telegram API error`
- `Bad Request`
- `Unauthorized`

**Common causes:**
- Bot token invalid
- Sticker set name already exists
- Invalid emoji
- File too large or invalid format

### 2. File Not Found Errors
Look for:
- `First sticker file not found`
- `ENOENT`
- `No such file`

**Common causes:**
- Worker didn't save file correctly
- File path mismatch
- File cleanup happened too early

### 3. Worker Communication Errors
Look for:
- `ECONNREFUSED`
- `timeout`
- `Worker request failed`

**Common causes:**
- Worker not running
- Network issue between bot and worker
- Worker crashed during conversion

## Detailed Debugging Steps

### Step 1: Check what happened during pack creation
```bash
# Get the last 200 lines to see full context
docker-compose logs --tail=200 bot | grep -A 10 -B 10 -i "pack\|sticker\|error\|failed"
```

### Step 2: Check worker logs for conversion issues
```bash
docker-compose logs --tail=100 worker
```

### Step 3: Check if files were created
```bash
# Check if worker created output files
docker-compose exec worker ls -lah /tmp/stickerputer/
docker-compose exec bot ls -lah /tmp/packputer/
```

### Step 4: Test worker directly
```bash
# Test worker health
curl http://localhost:8000/health

# Check worker logs for conversion attempts
docker-compose logs worker | grep -i "convert\|render"
```

## Export Full Logs for Analysis

### Save all logs to files:
```bash
cd /srv/PackPuter
docker-compose logs bot > bot_full_logs.txt
docker-compose logs worker > worker_full_logs.txt
docker-compose logs > all_logs.txt

# Then view them
cat bot_full_logs.txt | tail -100
```

## Check Specific Pack Creation Flow

### Look for these log patterns:

1. **File upload:**
   - `Processing...`
   - `Ready: X.Xs · XXXpx · XXXKB`

2. **Pack creation start:**
   - `Creating sticker pack...`
   - `Creating new pack`

3. **Telegram API calls:**
   - `createNewStickerSet`
   - `addStickerToSet`

4. **Errors:**
   - `Failed to create sticker set`
   - `Failed to add sticker to set`
   - `Telegram API error`

## Real-time Debugging

### Watch logs while testing:
```bash
# Terminal 1: Watch bot logs
docker-compose logs -f bot

# Terminal 2: Watch worker logs
docker-compose logs -f worker

# Then try creating a pack in Telegram
```

## Check Container Status During Failure

```bash
# Check if containers are still running
docker-compose ps

# Check resource usage
docker stats packputer_bot packputer_worker --no-stream
```

## Common Fixes

### If "sticker set already exists":
- The pack name is already taken
- Try a different pack title
- Or add to existing pack instead

### If "file not found":
- Check worker completed conversion
- Check file paths in logs
- Verify shared volume is working

### If "Telegram API error":
- Check bot token is valid
- Check bot has permission to create sticker sets
- Verify emoji is valid (single emoji, not text)

## Get Detailed Error Information

```bash
# Get last error with full stack trace
docker-compose logs bot | grep -A 20 "Error\|error\|Error:"

# Get all pack-related logs
docker-compose logs bot | grep -i "pack" -A 5 -B 5
```

