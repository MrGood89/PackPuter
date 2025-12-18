# Memeputer Commands Setup Guide

This document provides instructions for setting up all PackPuter bot commands in Memeputer.

## Environment Variables

Make sure these are set in your `.env` file:
```bash
TELEGRAM_BOT_TOKEN=8308689113:AAF77Oi31rm_gtNbGBW-5fka5tN9QcC38wU
BOT_USERNAME=PackPuterBot
WORKER_URL=http://worker:8000
SUPABASE_URL=https://ilmrsqmtvfiogsqivfer.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MEMEPUTER_API_KEY=_9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8
MEMEPUTER_AGENT_ID=0959084c-7e28-4365-8c61-7d94559e3834
MEMEPUTER_API_BASE=https://developers.memeputer.com
```

## Bot Service URL

Your bot service should be accessible at:
```
https://your-bot-domain.com
```

Or if using a tunnel:
```
https://your-ngrok-url.ngrok.io
```

## Commands to Create in Memeputer

### 1. `/pack` - Main Start Command

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/pack
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/generate",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✓ (checked)

**Response Template:**
```
Welcome to PackPuter! 🧠📦
```

---

### 2. `/batch` - Batch Convert

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/batch
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/batch",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✓

**Response Template:**
```
Send up to 10 GIFs/videos. I'll convert each into Telegram-ready stickers.
When finished, use /done command.
```

---

### 3. `/ai` - AI Video Sticker Maker

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/ai
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/ai",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✓

**Response Template:**
```
Send a base image (PNG preferred, JPG also accepted).
```

---

### 4. `/ai_image` - AI Image Sticker Maker

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/ai_image
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/ai_image",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✓

**Response Template:**
```
Send a base image (PNG preferred, JPG also accepted).
```

---

### 5. `/generate` - AI Generate Pack

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/pack
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/generate",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✓

**Response Template:**
```
How many stickers? Reply with "6" or "12"
```

---

### 6. `/done` - Finish Batch

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/done
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/done",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✓

**Response Template:**
```
✅ All files ready! Reply with:
• "new" to create a new pack
• "existing <pack_name>" to add to existing pack
```

---

### 7. `/help` - Help Command

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/help
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/help",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✗ (unchecked - fast response)

**Response Template:**
```
PackPuter Help 📖

Commands:
/pack! - Start the bot and see main menu
/batch - Upload up to 10 GIFs/videos, convert them all, and create a pack
/ai - AI Video Sticker Maker: Send a base image, choose a template
/ai_image - AI Image Sticker Maker: Create static PNG stickers
/pack - AI Generate Pack: Generate a full sticker pack (6 or 12 stickers)
/done - Finish batch and proceed to pack creation

All stickers meet Telegram requirements:
• WEBM VP9 format (video) or PNG (static)
• ≤ 3 seconds (video)
• ≤ 30 fps (video)
• 512px max dimension
• ≤ 256 KB
```

---

### 8. `/mypacks` - My Packs (Future Feature)

**Type:** Webhook  
**Integrations:** Telegram ✓

**Parameters:** None

**Service URL:**
```
https://your-bot-domain.com/api/commands/mypacks
```

**HTTP Method:** POST

**Request Body Template:**
```json
{
  "update": {
    "message": {
      "from": {
        "id": "{{user_id}}",
        "username": "{{username}}"
      },
      "chat": {
        "id": "{{chat_id}}"
      },
      "text": "/mypacks",
      "message_id": "{{message_id}}"
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Memeputer-Signature": "{{agent_id}}"
}
```

**Process Asynchronously:** ✗

**Response Template:**
```
This feature will be available soon!
```

---

## Setting Up Webhook Endpoints in Your Bot

You need to create API endpoints in your bot service to handle these commands. Here's the structure:

### Example Express.js Endpoint Structure

```typescript
// bot/src/api/commands.ts
import express from 'express';
import { Telegraf } from 'telegraf';

const router = express.Router();

export function setupCommandRoutes(app: express.Application, bot: Telegraf) {
  // Middleware to verify Memeputer signature
  app.use('/api/commands', (req, res, next) => {
    // Verify signature if needed
    next();
  });

  // Pack! command
  app.post('/api/commands/pack!', async (req, res) => {
    try {
      // Convert Memeputer webhook to Telegram update format
      const update = convertMemeputerToTelegram(req.body);
      
      // Process with bot
      await bot.handleUpdate(update);
      
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process command' });
    }
  });

  // Similar endpoints for other commands...
}
```

### Converting Memeputer Webhook to Telegram Update

```typescript
function convertMemeputerToTelegram(memeputerBody: any): any {
  return {
    update_id: Date.now(),
    message: {
      message_id: memeputerBody.update?.message?.message_id || Date.now(),
      from: memeputerBody.update?.message?.from,
      chat: memeputerBody.update?.message?.chat,
      date: Math.floor(Date.now() / 1000),
      text: memeputerBody.update?.message?.text || '',
    },
  };
}
```

## Important Notes

1. **`/start` is Memeputer's default** - We use `/pack` as our main command
2. **All commands should be Webhook type** - This allows Memeputer to call your bot service
3. **Process Asynchronously** - Enable for long-running operations (batch, ai, etc.)
4. **Telegram Integration** - Make sure Telegram is checked for all commands
5. **Service URL** - Replace `https://your-bot-domain.com` with your actual bot service URL
6. **Headers** - Use `Content-Type: application/json` for all commands
7. **Command Names** - Changed from `/pack!` to `/pack` (exclamation mark not allowed)

## Testing

After setting up commands in Memeputer:

1. Test each command in Telegram
2. Check bot logs for webhook calls
3. Verify responses are sent correctly
4. Test file uploads (for batch, ai, ai_image commands)

## Troubleshooting

- **Command not responding**: Check service URL is accessible
- **401 Unauthorized**: Verify MEMEPUTER_API_KEY in bot service
- **Timeout errors**: Enable "Process Asynchronously" for slow commands
- **File uploads not working**: Ensure webhook can handle multipart/form-data

