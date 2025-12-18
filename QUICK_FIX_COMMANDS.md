# Quick Fix Commands for VM

## 1. Find Your Service URL

### Get Public IP
```bash
curl -s ifconfig.me
```

### Check Ports
```bash
cd /srv/PackPuter
docker-compose ps
cat docker-compose.yml | grep ports
```

### Test Service
```bash
# Test worker (port 8000)
curl http://localhost:8000/health

# Get your IP
MY_IP=$(curl -s ifconfig.me)
echo "Your service URL: http://$MY_IP:8000"
```

## 2. Test Memeputer API

```bash
# Test agent chat endpoint
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' | jq .
```

## 3. Update and Restart

```bash
cd /srv/PackPuter
git pull origin main
docker-compose down
docker-compose build --no-cache bot
docker-compose up -d
docker-compose logs -f bot
```

## 4. Check Logs for Memeputer Calls

Watch for:
- `[Memeputer] Calling endpoint: ...`
- `[Memeputer] Response received: ...`
- `[Memeputer] ✅ Using AI-generated blueprint` (success)
- `[Memeputer] ❌ Request failed` (error)

