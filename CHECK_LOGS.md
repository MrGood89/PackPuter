# How to Check PackPuter Logs

## Quick Commands

### Check bot logs:
```bash
cd /srv/PackPuter
docker-compose logs bot
```

### Check worker logs:
```bash
docker-compose logs worker
```

### Check all logs:
```bash
docker-compose logs
```

### Follow logs in real-time (live updates):
```bash
docker-compose logs -f bot
docker-compose logs -f worker
docker-compose logs -f  # All services
```

### Check last 50 lines:
```bash
docker-compose logs --tail=50 bot
docker-compose logs --tail=50 worker
```

### Check last 100 lines with timestamps:
```bash
docker-compose logs --tail=100 -t bot
docker-compose logs --tail=100 -t worker
```

## Check Service Status

### See if containers are running:
```bash
docker-compose ps
```

### Check container status:
```bash
docker ps -a | grep packputer
```

### Check if containers exited:
```bash
docker-compose ps -a
```

## Common Issues and What to Look For

### Bot not starting:
Look for errors like:
- `TELEGRAM_BOT_TOKEN is required`
- `Failed to start bot`
- Connection errors

### Worker not responding:
Look for errors like:
- Port conflicts
- FFmpeg not found
- Python import errors

### Container keeps restarting:
```bash
docker-compose ps
# Look for "Restarting" status
docker-compose logs --tail=50 bot
```

## Detailed Diagnostics

### Check if containers are actually running:
```bash
docker ps
```

### Check container resource usage:
```bash
docker stats packputer_bot packputer_worker
```

### Enter container to debug:
```bash
# Enter bot container
docker-compose exec bot sh

# Enter worker container
docker-compose exec worker bash
```

### Test worker health endpoint:
```bash
curl http://localhost:8000/health
```

### Check environment variables:
```bash
# Check bot env
docker-compose exec bot env | grep TELEGRAM

# Check worker env
docker-compose exec worker env | grep MAX
```

## Export Logs to File

### Save logs to file:
```bash
docker-compose logs bot > bot_logs.txt
docker-compose logs worker > worker_logs.txt
docker-compose logs > all_logs.txt
```

## Restart and Check Again

### Restart services:
```bash
docker-compose restart
```

### Stop and start fresh:
```bash
docker-compose down
docker-compose up -d
docker-compose logs -f
```

## Most Common Commands

**For quick diagnosis, run these:**
```bash
cd /srv/PackPuter
docker-compose ps
docker-compose logs --tail=50 bot
docker-compose logs --tail=50 worker
curl http://localhost:8000/health
```

