# Bot Setup Checklist - New Bot

When you create a new Telegram bot, you need to update the following:

## 1. Environment Variables (bot/.env)

Update these in `bot/.env`:

```bash
TELEGRAM_BOT_TOKEN=your_new_bot_token_here
BOT_USERNAME=your_new_bot_username_here  # WITHOUT the @ symbol
```

**Important:** 
- `BOT_USERNAME` must match your bot's actual username (without @)
- This is used to generate sticker set names (must end with `_by_<bot_username>`)
- Get your bot username from @BotFather or by sending `/start` to your bot and checking the bot's profile

## 2. Restart Docker Container

After updating `.env`, you MUST restart the container to load new environment variables:

```bash
cd /srv/PackPuter
docker-compose restart bot
```

Or rebuild if needed:
```bash
docker-compose build bot
docker-compose restart bot
```

## 3. Verify Bot is Running

Check logs to ensure bot started successfully:

```bash
docker-compose logs -f bot
```

You should see:
```
[Bot] PackPuter bot is running!
[Bot] Commands registered successfully with Telegram
```

## 4. Test Bot

1. Open Telegram and find your bot
2. Send `/start` - should see inline buttons menu
3. If bot doesn't respond, check:
   - Logs for errors
   - Bot token is correct
   - Bot username matches (without @)

## 5. Common Issues

### Bot not responding
- **Check:** Bot token is correct in `bot/.env`
- **Check:** Container restarted after env change
- **Check:** Logs show bot started: `docker-compose logs bot`

### Sticker set creation fails
- **Check:** `BOT_USERNAME` matches your bot's actual username (without @)
- **Check:** Sticker set short_name ends with `_by_<bot_username>`
- **Check:** Bot has permission to create sticker sets

### Commands not working
- Commands are auto-registered on bot startup
- If missing, check logs for registration errors
- You can manually set commands in @BotFather: `/setcommands`

## 6. Get Bot Username

To find your bot's username:
1. Send `/start` to your bot
2. Click on bot's name/profile
3. Username is shown (without @)
4. Or check @BotFather → `/mybots` → Select your bot → See username

## 7. Verify Environment Variables

Check if env vars are loaded correctly:

```bash
docker-compose exec bot printenv | grep TELEGRAM
docker-compose exec bot printenv | grep BOT_USERNAME
```

Both should show your values.

