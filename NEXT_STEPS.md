# Next Steps After Command Setup

Now that all commands are set up in Memeputer, here are the next steps:

## ✅ Completed
- [x] All webhook commands created in Memeputer (`/pack`, `/batch`, `/ai`, `/ai_image`, `/generate`, `/done`, `/mypacks`)
- [x] `/start` and `/help` text commands configured

## 🔧 Next Steps

### 1. Set Up Webhook Endpoints in Your Bot Service

Your bot currently runs as a direct Telegram bot. To work with Memeputer webhooks, you need to:

**Option A: Add Webhook Endpoints (Recommended)**
- Create Express.js endpoints that receive Memeputer webhooks
- Convert Memeputer webhook format to Telegram update format
- Process commands through your existing bot handlers

**Option B: Use Memeputer as Proxy (Simpler)**
- Configure Memeputer to forward commands to your bot's Telegram webhook
- Your bot receives commands directly from Telegram (via Memeputer)

### 2. Create Webhook Handler Endpoints

Create a new file: `bot/src/api/webhooks.ts`

```typescript
import express from 'express';
import { Telegraf } from 'telegraf';

export function setupWebhookRoutes(app: express.Application, bot: Telegraf) {
  // Middleware to parse JSON
  app.use('/api/commands', express.json());

  // Generic command handler
  app.post('/api/commands/:command', async (req, res) => {
    try {
      const { command } = req.params;
      const memeputerBody = req.body;

      // Convert Memeputer webhook to Telegram update format
      const telegramUpdate = convertMemeputerToTelegram(memeputerBody, command);

      // Process with bot
      await bot.handleUpdate(telegramUpdate);

      // Send immediate response to Memeputer
      res.json({ ok: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

function convertMemeputerToTelegram(memeputerBody: any, command: string): any {
  // Extract data from Memeputer webhook
  const userId = memeputerBody.update?.message?.from?.id || 
                 memeputerBody.user_id || 
                 parseInt(memeputerBody.update?.message?.from?.id);
  
  const chatId = memeputerBody.update?.message?.chat?.id || 
                 memeputerBody.chat_id || 
                 parseInt(memeputerBody.update?.message?.chat?.id);
  
  const messageId = memeputerBody.update?.message?.message_id || 
                    memeputerBody.message_id || 
                    parseInt(memeputerBody.update?.message?.message_id);
  
  const username = memeputerBody.update?.message?.from?.username || 
                   memeputerBody.username || 
                   '';

  // Create Telegram update format
  return {
    update_id: Date.now(),
    message: {
      message_id: messageId || Date.now(),
      from: {
        id: userId,
        is_bot: false,
        username: username,
        first_name: username || 'User',
      },
      chat: {
        id: chatId || userId,
        type: 'private',
      },
      date: Math.floor(Date.now() / 1000),
      text: `/${command}`,
    },
  };
}
```

### 3. Update Bot Entry Point

Update `bot/src/index.ts` to include webhook routes:

```typescript
import express from 'express';
import { setupWebhookRoutes } from './api/webhooks';

// ... existing bot setup ...

// If running as webhook server (not polling)
if (process.env.WEBHOOK_MODE === 'true') {
  const app = express();
  setupWebhookRoutes(app, bot);
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[Bot] Webhook server listening on port ${port}`);
  });
} else {
  // Existing polling mode
  bot.launch().then(async () => {
    // ... existing code ...
  });
}
```

### 4. Environment Variables

Add to `bot/.env`:
```bash
# Webhook mode (set to 'true' if using Memeputer webhooks)
WEBHOOK_MODE=false

# Port for webhook server (if WEBHOOK_MODE=true)
PORT=3000

# Your bot's public URL (for webhook verification)
BOT_WEBHOOK_URL=https://your-bot-domain.com
```

### 5. Test Commands

1. **Test `/start` and `/help`:**
   - These should work immediately (Text commands)
   - Type `/start` or `/help` in Telegram

2. **Test Webhook Commands:**
   - Type `/pack` in Telegram
   - Check Memeputer logs for webhook calls
   - Check your bot logs for received webhooks
   - Verify bot responds correctly

3. **Test File Uploads:**
   - Try `/batch` and upload a file
   - Try `/ai` and upload an image
   - Verify files are processed correctly

### 6. Deploy Bot Service

If not already deployed:

1. **Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Or Manual Deployment:**
   - Ensure bot service is accessible via HTTPS
   - Update service URLs in Memeputer commands
   - Test all commands

### 7. Monitor & Debug

1. **Check Bot Logs:**
   ```bash
   docker-compose logs -f bot
   ```

2. **Check Memeputer Logs:**
   - Go to Memeputer dashboard → Logs
   - See webhook calls and responses

3. **Common Issues:**
   - **401 Unauthorized:** Check bot token
   - **Timeout:** Enable "Process Asynchronously" in Memeputer
   - **Wrong format:** Check webhook conversion function
   - **No response:** Check bot is running and accessible

---

## Alternative: Direct Telegram Integration

If you prefer to keep using Telegram directly (without Memeputer webhooks):

1. Keep bot in polling mode (`WEBHOOK_MODE=false`)
2. Commands work directly via Telegram
3. Memeputer is only used for:
   - AI image generation (via API)
   - Blueprint generation (via API)
   - Command menu (Text commands)

This is simpler but you won't get Memeputer's command analytics and cross-platform support.

---

## Summary Checklist

- [ ] Configure `/start` Response Text in Memeputer
- [ ] Configure `/help` Response Text in Memeputer
- [ ] Create webhook endpoints in bot service (if using webhooks)
- [ ] Test `/start` command
- [ ] Test `/help` command
- [ ] Test `/pack` command
- [ ] Test `/batch` with file upload
- [ ] Test `/ai` with image upload
- [ ] Test `/generate` command
- [ ] Deploy bot service (if needed)
- [ ] Monitor logs for errors

---

## Need Help?

If you encounter issues:
1. Check bot logs: `docker-compose logs -f bot`
2. Check Memeputer logs in dashboard
3. Verify service URLs are accessible
4. Test webhook endpoints with curl:
   ```bash
   curl -X POST https://your-bot-domain.com/api/commands/pack \
     -H "Content-Type: application/json" \
     -d '{"user_id": "123", "chat_id": "123", "text": "/pack"}'
   ```

