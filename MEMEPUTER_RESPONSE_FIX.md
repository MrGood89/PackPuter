# Memeputer API Response Fix

## Response Structure

Based on your test, Memeputer returns:
```json
{
  "data": {
    "response": "{\n  \"needs\": [\n    \"base_image\", \n    \"sticker_type\"\n  ],\n  \"hint\": \"Please provide 'base_image' URL/filename (logo or mascot) and 'sticker_type' (video or image) to continue.\"\n}",
    "model": "openai/gpt-4o:extended",
    "temperature": 1.6
  }
}
```

## What Was Fixed

1. **Response Parsing**: Updated to parse `response.data.data.response` as a JSON string
2. **Request Format**: Added `base_image` and `sticker_type` to the request
3. **Parameter Handling**: The agent asks for `base_image` and `sticker_type`, so we now include them

## Changes Made

### `bot/src/services/memeputerClient.ts`
- Updated `getBlueprint()` to accept `baseImagePath` parameter
- Added `base_image` and `sticker_type` to request
- Fixed response parsing to handle `response.data.data.response` structure
- Added better logging for debugging

### `bot/src/telegram/flows_ai.ts`
- Updated to pass `baseImage.filePath` to `getBlueprint()`

## Testing

After pulling changes, test again:

```bash
cd /srv/PackPuter
git pull origin main
docker-compose down
docker-compose build --no-cache bot
docker-compose up -d
docker-compose logs -f bot | grep Memeputer
```

## Expected Behavior

1. **With base_image**: Agent should receive `base_image` and `sticker_type` parameters
2. **Response parsing**: Should correctly parse the nested JSON string
3. **Blueprint extraction**: Should extract blueprint from agent response or use fallback

## If Agent Still Asks for Parameters

The agent might need the actual image file uploaded, not just the filename. Options:

1. **Upload image to a public URL** (e.g., Imgur, Cloudinary) and send URL
2. **Use Memeputer's file upload API** (if available)
3. **Work with Memeputer team** to understand how to provide base_image

For now, the code will use fallback blueprints if the agent can't generate one.

