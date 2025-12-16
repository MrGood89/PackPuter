# PackPuter VM Deployment Guide

This guide will help you deploy PackPuter on a virtual machine (Ubuntu/Debian).

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ VM
- SSH access to the VM
- Docker and Docker Compose installed
- Git installed
- At least 2GB RAM, 10GB disk space

## Step 1: Initial VM Setup

### Connect to your VM
```bash
ssh user@your-vm-ip
```

### Update system
```bash
sudo apt update
sudo apt upgrade -y
```

### Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Log out and back in for group changes to take effect
exit
```

Reconnect via SSH after logging out.

### Verify Docker installation
```bash
docker --version
docker-compose --version
```

## Step 2: Clone Repository

### Create project directory
```bash
mkdir -p ~/projects
cd ~/projects
```

### Clone from GitHub
```bash
git clone https://github.com/MrGood89/PackPuter.git
cd PackPuter
```

## Step 3: Configure Environment

### Set up bot environment
```bash
cd bot
cp .env.example .env
nano .env
```

Edit the `.env` file with your values:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=PackPuterBot
WORKER_URL=http://worker:8000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEMEPUTER_AGENT_URL=
MEMEPUTER_AGENT_SECRET=
```

**Important:** Replace `your_bot_token_here` with your actual Telegram bot token from @BotFather.

### Set up worker environment
```bash
cd ../worker
cp .env.example .env
nano .env
```

The default values should work:
```env
MAX_STICKER_KB=256
MAX_SECONDS=3.0
MAX_FPS=30
TARGET_SIDE=512
```

## Step 4: Build and Start Services

### Return to project root
```bash
cd ~/projects/PackPuter
```

### Build Docker images
```bash
docker-compose build
```

This may take 5-10 minutes the first time as it downloads base images and installs dependencies.

### Start services
```bash
docker-compose up -d
```

The `-d` flag runs containers in detached mode (background).

### Check service status
```bash
docker-compose ps
```

You should see both `packputer_bot` and `packputer_worker` running.

## Step 5: Verify Deployment

### Check bot logs
```bash
docker-compose logs bot
```

You should see: `PackPuter bot is running!`

### Check worker logs
```bash
docker-compose logs worker
```

### Test worker health endpoint
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok"}`

### Test bot in Telegram
1. Open Telegram
2. Find your bot (the username you set in `.env`)
3. Send `/start`
4. You should see the main menu

## Step 6: Set Up Auto-Start (Optional)

### Create systemd service
```bash
sudo nano /etc/systemd/system/packputer.service
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
WorkingDirectory=/home/YOUR_USERNAME/projects/PackPuter
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=YOUR_USERNAME
Group=docker

[Install]
WantedBy=multi-user.target
```

Replace `YOUR_USERNAME` with your actual username.

### Enable and start service
```bash
sudo systemctl daemon-reload
sudo systemctl enable packputer.service
sudo systemctl start packputer.service
```

### Check service status
```bash
sudo systemctl status packputer.service
```

## Step 7: Monitoring and Maintenance

### View logs
```bash
# All services
docker-compose logs -f

# Bot only
docker-compose logs -f bot

# Worker only
docker-compose logs -f worker
```

### Restart services
```bash
docker-compose restart
```

### Stop services
```bash
docker-compose down
```

### Update from GitHub
```bash
cd ~/projects/PackPuter
git pull
docker-compose build
docker-compose up -d
```

### Clean up old Docker images (optional)
```bash
docker system prune -a
```

## Troubleshooting

### Bot not responding
1. Check bot token is correct: `cat bot/.env | grep TELEGRAM_BOT_TOKEN`
2. Check bot logs: `docker-compose logs bot`
3. Verify bot is running: `docker-compose ps`

### Worker not responding
1. Check worker logs: `docker-compose logs worker`
2. Test health endpoint: `curl http://localhost:8000/health`
3. Check if ffmpeg is installed in container: `docker-compose exec worker which ffmpeg`

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a
```

### Port conflicts
If port 8000 is already in use:
1. Edit `docker-compose.yml`
2. Change `"8000:8000"` to `"8001:8000"` (or another port)
3. Restart: `docker-compose up -d`

### Permission errors
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

## Security Considerations

1. **Firewall**: Only expose necessary ports
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw enable
   ```

2. **Environment variables**: Never commit `.env` files to Git

3. **Regular updates**: Keep system and Docker images updated
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker-compose pull
   ```

## Backup

### Backup environment files
```bash
cd ~/projects/PackPuter
tar -czf packputer-backup-$(date +%Y%m%d).tar.gz bot/.env worker/.env
```

### Restore from backup
```bash
tar -xzf packputer-backup-YYYYMMDD.tar.gz
```

## Next Steps

- Set up monitoring (optional): Use tools like Prometheus or Grafana
- Set up reverse proxy (optional): Use Nginx for SSL termination
- Configure log rotation: Prevent logs from filling disk
- Set up automated backups: Schedule regular backups

## Support

If you encounter issues:
1. Check logs: `docker-compose logs`
2. Verify environment variables are set correctly
3. Ensure Docker and Docker Compose are properly installed
4. Check VM has sufficient resources (RAM, disk space)

