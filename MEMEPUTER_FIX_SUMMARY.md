# Memeputer API Fix Summary

## Issues Fixed

### 1. Wrong API Endpoint
**Problem:** Bot was calling `/api/v1/agents/{id}/generate` which returns 404.

**Fix:** Changed to `/v1/agents/{id}/chat` (based on Memeputer API structure).

### 2. Wrong Authentication Header
**Problem:** Using `Authorization: Bearer` header.

**Fix:** Changed to `x-api-key` header (Memeputer's standard).

### 3. Better Error Handling
**Added:**
- Detailed logging of API calls
- Multiple response format parsing
- Better error messages

## Files Changed

1. **`bot/src/services/memeputerClient.ts`**
   - Changed endpoint from `/api/v1/agents/{id}/generate` to `/v1/agents/{id}/chat`
   - Changed header from `Authorization: Bearer` to `x-api-key`
   - Added better response parsing for different Memeputer response formats
   - Added detailed logging

2. **`bot/src/services/memeputerImageClient.ts`**
   - Changed endpoint from `/api/v1/agents/{id}/generate-image` to `/v1/agents/{id}/chat`
   - Changed header from `Authorization: Bearer` to `x-api-key`
   - Updated request format to use chat message

## Testing

### Test Memeputer API Directly
```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' | jq .
```

### Check Logs After Update
```bash
cd /srv/PackPuter
docker-compose logs -f bot | grep Memeputer
```

Look for:
- `[Memeputer] Calling endpoint: ...` - Shows the endpoint being called
- `[Memeputer] Response received: ...` - Shows response structure
- `[Memeputer] ✅ Using AI-generated blueprint` - Success!
- `[Memeputer] ❌ Request failed` - Still an error

## Finding Your Service URL

### Get VM Public IP
```bash
curl -s ifconfig.me
```

### Your Service URL
Based on docker-compose.yml, your worker is on port **8000**:

```
http://YOUR_VM_IP:8000
```

### For Memeputer Webhooks
If you want to use webhooks instead of direct API calls:

```
http://YOUR_VM_IP:8000/api/commands/{command_name}
```

**Note:** You'll need to:
1. Expose port 8000 in your firewall
2. Or set up nginx reverse proxy on port 80/443

## Next Steps

1. **Pull changes and restart:**
   ```bash
   cd /srv/PackPuter
   git pull origin main
   docker-compose down
   docker-compose build --no-cache bot
   docker-compose up -d
   docker-compose logs -f bot
   ```

2. **Test the bot:**
   - Try AI Generate Pack
   - Try AI Image Sticker Maker
   - Check logs for Memeputer API calls

3. **If still getting 404:**
   - Check Memeputer dashboard for correct API endpoint
   - Test with curl (see TEST_MEMEPUTER_API.md)
   - Consider using Memeputer commands/webhooks instead

## Alternative: Use Memeputer Commands

If direct API doesn't work, you can:
1. Create Memeputer commands for blueprint/image generation
2. Call those commands via webhook
3. Parse the response

This might be more reliable if Memeputer doesn't expose direct API endpoints.

