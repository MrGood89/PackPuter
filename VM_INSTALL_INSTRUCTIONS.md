# PackPuter VM Installation Instructions
## Location: /srv/PackPuter/

Follow these steps on your VM to install and run PackPuter.

## Step 1: Navigate to Installation Directory

```bash
cd /srv/PackPuter
```

If the directory doesn't exist, create it:
```bash
mkdir -p /srv/PackPuter
cd /srv/PackPuter
```

## Step 2: Check Docker Installation

```bash
docker --version
docker-compose --version
```

If Docker is not installed, install it:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt update
apt install docker-compose -y
```

## Step 3: Clone Repository

```bash
cd /srv/PackPuter
git clone https://github.com/MrGood89/PackPuter.git .
```

**Note:** The `.` at the end clones directly into the current directory (`/srv/PackPuter/`).

If you get an error about the directory not being empty, you can either:
- Remove existing files: `rm -rf /srv/PackPuter/*` (be careful!)
- Or clone to a subdirectory: `git clone https://github.com/MrGood89/PackPuter.git repo` then `mv repo/* .`

## Step 4: Configure Bot Environment

```bash
cd /srv/PackPuter/bot
cp .env.example .env
nano .env
```

Edit the `.env` file and set:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
BOT_USERNAME=PackPuterBot
WORKER_URL=http://worker:8000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEMEPUTER_AGENT_URL=
MEMEPUTER_AGENT_SECRET=
```

**Important:** Replace `your_bot_token_from_botfather` with your actual Telegram bot token.

To save in nano: Press `Ctrl+X`, then `Y`, then `Enter`.

## Step 5: Configure Worker Environment

```bash
cd /srv/PackPuter/worker
cp .env.example .env
```

The default values should work, but you can edit if needed:
```bash
nano .env
```

Default values:
```env
MAX_STICKER_KB=256
MAX_SECONDS=3.0
MAX_FPS=30
TARGET_SIDE=512
```

## Step 6: Build Docker Images

```bash
cd /srv/PackPuter
docker-compose build
```

This will take 5-10 minutes the first time as it downloads base images and installs dependencies.

## Step 7: Start Services

```bash
docker-compose up -d
```

The `-d` flag runs containers in detached mode (background).

## Step 8: Verify Installation

### Check services are running:
```bash
docker-compose ps
```

You should see both `packputer_bot` and `packputer_worker` with status "Up".

### Check bot logs:
```bash
docker-compose logs bot
```

You should see: `PackPuter bot is running!`

### Check worker logs:
```bash
docker-compose logs worker
```

### Test worker health:
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok"}`

## Step 9: Test the Bot

1. Open Telegram
2. Find your bot (the username you set in `.env`)
3. Send `/start`
4. You should see the main menu with options

## Useful Commands

### View logs:
```bash
# All services
docker-compose logs -f

# Bot only
docker-compose logs -f bot

# Worker only
docker-compose logs -f worker
```

### Restart services:
```bash
cd /srv/PackPuter
docker-compose restart
```

### Stop services:
```bash
docker-compose down
```

### Start services again:
```bash
docker-compose up -d
```

### Update from GitHub:
```bash
cd /srv/PackPuter
git pull
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Bot not responding:
1. Check bot token: `cat /srv/PackPuter/bot/.env | grep TELEGRAM_BOT_TOKEN`
2. Check bot logs: `docker-compose logs bot`
3. Verify bot is running: `docker-compose ps`

### Worker not responding:
1. Check worker logs: `docker-compose logs worker`
2. Test health: `curl http://localhost:8000/health`
3. Check ffmpeg: `docker-compose exec worker which ffmpeg`

### Permission errors:
```bash
# If you get permission errors, you might need to use sudo
sudo docker-compose up -d
```

### Port 8000 already in use:
Edit `docker-compose.yml` and change the port mapping:
```yaml
ports:
  - "8001:8000"  # Change 8000 to 8001 or another port
```

## Set Up Auto-Start (Optional)

Create a systemd service to auto-start PackPuter on boot:

```bash
nano /etc/systemd/system/packputer.service
```

Add this content:
```ini
[Unit]
Description=PackPuter Bot and Worker
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/srv/PackPuter
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=root

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable packputer.service
systemctl start packputer.service
```

Check status:
```bash
systemctl status packputer.service
```

## Quick Reference

**Project location:** `/srv/PackPuter/`

**Key files:**
- Bot config: `/srv/PackPuter/bot/.env`
- Worker config: `/srv/PackPuter/worker/.env`
- Docker compose: `/srv/PackPuter/docker-compose.yml`

**Common commands:**
```bash
cd /srv/PackPuter
docker-compose logs -f bot      # Watch bot logs
docker-compose logs -f worker   # Watch worker logs
docker-compose restart          # Restart all services
docker-compose down             # Stop all services
docker-compose up -d            # Start all services
```

