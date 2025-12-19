# Docker Compose ContainerConfig Error - Fix

## Problem
Docker Compose fails with `KeyError: 'ContainerConfig'` when trying to recreate containers. This is a Docker metadata inconsistency issue.

## Solution

Run these commands on the VM:

```bash
cd /srv/PackPuter

# Stop and remove containers
docker-compose down

# Remove the bot container (if it exists)
docker rm packputer_bot 2>/dev/null || true

# Remove the bot image (if it exists)
docker rmi packputer_bot 2>/dev/null || true

# Rebuild and start
docker-compose build bot
docker-compose up -d
```

## Alternative: Force Recreate

If the above doesn't work, try:

```bash
cd /srv/PackPuter
docker-compose down
docker-compose up -d --force-recreate --build
```

## Verify

After starting, check logs:

```bash
docker-compose logs --tail=50 -f bot
```

You should see the bot starting up without errors.

