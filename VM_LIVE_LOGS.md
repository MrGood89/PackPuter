# VM Live Logs Commands

## View All Services (Bot + Worker) - Full Live Logs

```bash
cd /srv/PackPuter
docker-compose logs -f
```

## View Specific Service

### Bot Only
```bash
cd /srv/PackPuter
docker-compose logs -f bot
```

### Worker Only
```bash
cd /srv/PackPuter
docker-compose logs -f worker
```

## View Last N Lines Then Follow

### Last 100 lines, then follow
```bash
cd /srv/PackPuter
docker-compose logs --tail=100 -f
```

### Last 500 lines, then follow
```bash
cd /srv/PackPuter
docker-compose logs --tail=500 -f
```

## View Logs with Timestamps

```bash
cd /srv/PackPuter
docker-compose logs -f --timestamps
```

## Filter Logs (Grep)

### Filter for Memeputer logs
```bash
cd /srv/PackPuter
docker-compose logs -f | grep -i memeputer
```

### Filter for errors
```bash
cd /srv/PackPuter
docker-compose logs -f | grep -i error
```

### Filter for specific user
```bash
cd /srv/PackPuter
docker-compose logs -f | grep "6656015198"
```

## View Logs Since Last Restart

```bash
cd /srv/PackPuter
docker-compose logs --since 10m -f
```

## All-in-One: Full Live Logs with Timestamps

```bash
cd /srv/PackPuter && docker-compose logs --tail=200 --timestamps -f
```

## Quick Test Commands

### Check if services are running
```bash
cd /srv/PackPuter
docker-compose ps
```

### Restart and view logs
```bash
cd /srv/PackPuter
docker-compose restart && docker-compose logs -f
```

### Rebuild and view logs
```bash
cd /srv/PackPuter
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f
```

## Exit Logs

Press `Ctrl+C` to exit live log view.

