# PackPuter Commands Summary

## All Commands

Here are all the commands that need to be set up in Memeputer:

### 1. `/pack` - Main Start Command (replaces /start)
- **Description:** Start the bot and see main menu
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 2. `/batch` - Batch Convert
- **Description:** Start batch conversion (up to 10 files)
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 3. `/ai` - AI Video Sticker Maker
- **Description:** AI Video Sticker Maker - create animated sticker
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 4. `/ai_image` - AI Image Sticker Maker
- **Description:** AI Image Sticker Maker - create static PNG stickers
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 5. `/generate` - AI Generate Pack
- **Description:** AI Generate Pack - create pack with AI
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 6. `/done` - Finish Batch
- **Description:** Finish batch and create pack
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 7. `/help` - Help
- **Description:** Show help information
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

### 8. `/mypacks` - My Packs (Future)
- **Description:** Show my sticker packs (future feature)
- **Type:** Webhook
- **Integrations:** Telegram ✓
- **Parameters:** None

## Quick Setup Checklist

For each command in Memeputer:

1. ✅ **Type:** Webhook
2. ✅ **Integrations:** Check "Telegram"
3. ✅ **Parameters:** None (for all commands)
4. ✅ **Service URL:** `https://your-bot-domain.com/api/commands/{command_name}`
5. ✅ **HTTP Method:** POST
6. ✅ **Process Asynchronously:** 
   - ✓ Checked for: `/batch`, `/ai`, `/ai_image`, `/pack`, `/done`
   - ✗ Unchecked for: `/pack!`, `/help`, `/mypacks` (fast responses)

## Request Body Template (for all commands)

```json
{
  "update": {
    "message": {
      "from": {
        "id": {{user_id}},
        "username": "{{username}}"
      },
      "chat": {
        "id": {{chat_id}}
      },
      "text": "/{command_name}",
      "message_id": {{message_id}}
    }
  }
}
```

## Headers (for all commands)

```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

## Important Notes

1. **`/start` is Memeputer's default** - We use `/pack` as our main command
2. **All commands are Webhook type** - This allows Memeputer to call your bot service
3. **Service URL format:** Replace `{command_name}` with the actual command (e.g., `pack!`, `batch`, `ai`, etc.)
4. **Special characters:** No special characters needed - all commands use standard names

## Environment Variables Updated

The bot now uses:
- `MEMEPUTER_API_BASE` instead of `MEMEPUTER_AGENT_URL`
- `MEMEPUTER_API_KEY` for API authentication
- `MEMEPUTER_AGENT_ID` for agent identification

## Image Generation

AI Image Sticker Maker now uses Memeputer API instead of OpenAI:
- Calls: `POST /api/v1/agents/{agent_id}/generate-image`
- Sends base image as base64
- Receives generated image URL
- Downloads and processes the image

See `MEMEPUTER_COMMANDS_SETUP.md` for detailed setup instructions.

