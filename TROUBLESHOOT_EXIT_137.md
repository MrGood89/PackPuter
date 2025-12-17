# Troubleshooting Exit Code 137

Exit code 137 means the container was killed by the system, typically due to:
- **Out of Memory (OOM)** - Most common cause
- Manual kill signal (SIGKILL)
- Docker resource limits

## Quick Fixes

### 1. Check Container Status

```bash
cd /srv/PackPuter
docker-compose ps
docker-compose logs --tail=100 bot
```

### 2. Check System Memory

```bash
free -h
docker stats
```

### 3. Check if Container is Restarting

```bash
docker-compose ps -a
# Look for "Restarting" status
```

### 4. View Full Logs

```bash
docker-compose logs --tail=200 bot
# Look for errors before the exit
```

## Common Causes & Solutions

### Cause 1: Out of Memory (OOM)

**Symptoms:**
- Container exits immediately after starting
- Logs show normal startup then sudden exit
- `docker stats` shows high memory usage

**Solution:**
Add memory limits to `docker-compose.yml`:

```yaml
services:
  bot:
    # ... existing config ...
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

Or increase VM memory if it's too low.

### Cause 2: Unhandled Promise Rejection

**Symptoms:**
- Error in logs before exit
- "Unhandled promise rejection" messages

**Solution:**
The bot should already have error handlers, but check logs for specific errors.

### Cause 3: Supabase Connection Issues

**Symptoms:**
- "Invalid API key" errors in logs
- Job processor failing repeatedly

**Solution:**
- Verify Supabase credentials in `bot/.env`
- If Supabase is not configured, the bot should still work (jobs processed in-memory)
- Check if repeated connection attempts are causing memory issues

### Cause 4: Infinite Loop or Memory Leak

**Symptoms:**
- Memory usage gradually increases
- Container works initially then crashes

**Solution:**
Check for:
- Memory leaks in job processor
- Unclosed file handles
- Growing arrays/objects

## Immediate Actions

1. **Restart the container:**
   ```bash
   docker-compose restart bot
   docker-compose logs -f bot
   ```

2. **Check if it stays running:**
   ```bash
   # Watch for 30 seconds
   timeout 30 docker-compose logs -f bot
   ```

3. **If it keeps crashing, check memory:**
   ```bash
   docker stats --no-stream
   free -h
   ```

4. **Temporary workaround - disable job processor:**
   If Supabase is causing issues, you can temporarily disable the job processor by commenting out the start call in `bot/src/index.ts`.

## Debugging Steps

1. **Check recent logs:**
   ```bash
   docker-compose logs --tail=500 bot | grep -i error
   ```

2. **Check system logs for OOM:**
   ```bash
   dmesg | grep -i "out of memory"
   dmesg | grep -i "killed process"
   ```

3. **Run container interactively:**
   ```bash
   docker-compose run --rm bot sh
   # Then manually run: node dist/index.js
   ```

4. **Check Node.js memory usage:**
   Add to `bot/src/index.ts`:
   ```typescript
   console.log('Node.js memory:', process.memoryUsage());
   ```

## Prevention

1. **Add health checks:**
   ```yaml
   healthcheck:
     test: ["CMD", "node", "-e", "process.exit(0)"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

2. **Monitor memory usage:**
   ```bash
   watch -n 1 'docker stats --no-stream'
   ```

3. **Set up alerts** for container restarts

