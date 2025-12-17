# Troubleshooting 401 Unauthorized Error

## Error: `401: Unauthorized`

This means Telegram is rejecting your bot token. The bot cannot authenticate.

## Step-by-Step Fix

### 1. Verify Token in .env File

Check `bot/.env` on the VM:

```bash
cd /srv/PackPuter
cat bot/.env | grep TELEGRAM_BOT_TOKEN
```

**Common issues:**
- Token has extra spaces: `TELEGRAM_BOT_TOKEN= 123456:ABC...` ❌
- Token missing: `TELEGRAM_BOT_TOKEN=` ❌
- Token has quotes: `TELEGRAM_BOT_TOKEN="123456:ABC..."` ❌
- Token has newlines or special characters

**Correct format:**
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 2. Get Fresh Token from BotFather

1. Open Telegram, go to @BotFather
2. Send `/mybots`
3. Select your bot
4. Click "API Token"
5. Copy the token (it looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. Update .env File

```bash
cd /srv/PackPuter
nano bot/.env
```

Make sure it looks exactly like this (no quotes, no spaces):
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
BOT_USERNAME=your_bot_username
```

Save and exit (Ctrl+X, Y, Enter)

### 4. Verify Token is Loaded in Container

Check if the container sees the token:

```bash
docker-compose exec bot printenv | grep TELEGRAM_BOT_TOKEN
```

If it shows empty or wrong value, the .env file isn't being read.

### 5. Rebuild Container (if env not loading)

Sometimes Docker caches the env file. Force rebuild:

```bash
cd /srv/PackPuter
docker-compose down
docker-compose build --no-cache bot
docker-compose up -d bot
docker-compose logs -f bot
```

### 6. Test Token Manually

Test if the token works:

```bash
# Replace YOUR_TOKEN with your actual token
curl "https://api.telegram.org/botYOUR_TOKEN/getMe"
```

If this returns `{"ok":false,"error_code":401}`, the token is invalid.
If it returns `{"ok":true,"result":{...}}`, the token is valid.

### 7. Check for File Permissions

Make sure .env file is readable:

```bash
ls -la bot/.env
chmod 644 bot/.env
```

### 8. Verify docker-compose.yml

Check that docker-compose.yml references the .env file:

```bash
cat docker-compose.yml | grep env_file
```

Should show:
```yaml
env_file:
  - ./bot/.env
```

## Common Mistakes

1. **Copying token with extra characters** - Make sure no spaces before/after
2. **Using old token** - If you deleted and recreated bot, old token won't work
3. **Token from wrong bot** - Make sure you're using the token for the correct bot
4. **.env file in wrong location** - Must be in `bot/.env`, not root
5. **Container not restarted** - After changing .env, must restart container

## Quick Test Script

Run this to verify everything:

```bash
cd /srv/PackPuter

# 1. Check .env exists and has token
echo "=== Checking .env file ==="
if [ -f bot/.env ]; then
  echo "✓ .env file exists"
  if grep -q "TELEGRAM_BOT_TOKEN=" bot/.env; then
    TOKEN=$(grep "TELEGRAM_BOT_TOKEN=" bot/.env | cut -d'=' -f2 | tr -d ' ')
    if [ -n "$TOKEN" ]; then
      echo "✓ Token found in .env"
      echo "Token length: ${#TOKEN} characters"
    else
      echo "✗ Token is empty!"
    fi
  else
    echo "✗ TELEGRAM_BOT_TOKEN not found in .env"
  fi
else
  echo "✗ .env file not found!"
fi

# 2. Check container sees token
echo ""
echo "=== Checking container environment ==="
CONTAINER_TOKEN=$(docker-compose exec -T bot printenv TELEGRAM_BOT_TOKEN 2>/dev/null | tr -d '\r')
if [ -n "$CONTAINER_TOKEN" ]; then
  echo "✓ Container has token"
  echo "Token length: ${#CONTAINER_TOKEN} characters"
else
  echo "✗ Container does not have token!"
fi

# 3. Test token with Telegram API
echo ""
echo "=== Testing token with Telegram API ==="
if [ -n "$TOKEN" ]; then
  RESPONSE=$(curl -s "https://api.telegram.org/bot${TOKEN}/getMe")
  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✓ Token is valid!"
    echo "$RESPONSE" | grep -o '"username":"[^"]*"' | head -1
  else
    echo "✗ Token is invalid!"
    echo "Response: $RESPONSE"
  fi
fi
```

Save this as `check_bot.sh`, make it executable, and run:
```bash
chmod +x check_bot.sh
./check_bot.sh
```

