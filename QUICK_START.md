# PackPuter Quick Start Guide

## ✅ Installation Complete!

Your PackPuter bot is now running on your VM. Here's how to verify and use it.

## Verify Services Are Running

On your VM, run:

```bash
cd /srv/PackPuter
docker-compose ps
```

You should see both `packputer_bot` and `packputer_worker` with status "Up".

## Check Logs

### Bot logs:
```bash
docker-compose logs bot
```

You should see: `PackPuter bot is running!`

### Worker logs:
```bash
docker-compose logs worker
```

### Test worker health:
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok"}`

## Test the Bot

1. **Open Telegram** and find your bot (the username you set in `bot/.env`)
2. **Send `/start`** - You should see the main menu
3. **Try "🎞️ Single Convert"** - Send a GIF or video file to test conversion

## Bot Features

### 🧰 Batch Convert (≤10)
- Upload up to 10 GIFs/videos
- Press "✅ Done" when finished
- Create new pack or add to existing
- Get your sticker pack link!

### 🎞️ Single Convert
- Convert one file to a sticker
- Get the converted file back

### ✨ AI Sticker Maker
- Send base image
- (Optional) Provide project context
- Choose template (GM, LFG, etc.)
- Get AI-generated animated sticker

### 🔥 AI Generate Pack
- Choose pack size (6 or 12)
- Choose theme (degen/wholesome/builder)
- Send base image
- Get full AI-generated sticker pack!

## Useful Commands

### View logs in real-time:
```bash
docker-compose logs -f bot
docker-compose logs -f worker
```

### Restart services:
```bash
docker-compose restart
```

### Stop services:
```bash
docker-compose down
```

### Start services:
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

### Bot not responding?
1. Check bot token is correct: `cat bot/.env | grep TELEGRAM_BOT_TOKEN`
2. Check bot logs: `docker-compose logs bot`
3. Verify bot is running: `docker-compose ps`

### Conversion fails?
1. Check worker logs: `docker-compose logs worker`
2. Test worker: `curl http://localhost:8000/health`
3. Verify ffmpeg: `docker-compose exec worker which ffmpeg`

### Need to change bot token?
1. Edit `bot/.env`
2. Restart: `docker-compose restart bot`

## Next Steps

- Test all features to make sure everything works
- Share your bot with users!
- Monitor logs for any issues
- Set up auto-start (see VM_DEPLOYMENT.md)

## Congratulations! 🎉

Your PackPuter bot is live and ready to create sticker packs!

