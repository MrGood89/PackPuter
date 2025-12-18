# Memeputer Commands Setup - Detailed Step-by-Step Guide

This guide provides detailed, one-by-one instructions for setting up each PackPuter command in Memeputer.

## Prerequisites

1. Your bot service must be accessible via HTTPS (e.g., `https://your-bot-domain.com` or ngrok tunnel)
2. Environment variables configured in your bot's `.env` file
3. Memeputer agent created and configured

---

## Command 1: `/pack` - Main Start Command

### Step 1: Create New Command
1. Go to Memeputer dashboard → Your Agent → Commands
2. Click **"Add Command"** button
3. Fill in the form:

### Step 2: Basic Information
- **Name:** `pack`
- **Description:** `Start the bot and see main menu`

### Step 3: Type & Integrations
- **Type:** Select **"Webhook"** (radio button)
- **Integrations:** Check **"Telegram"** ✓ (uncheck X and x402 if checked)

### Step 4: Parameters
- Leave **Parameters** section empty (no parameters needed)
- If you see "Add Parameter" button, don't click it

### Step 5: Service URL
- **Service URL:** 
  ```
  https://your-bot-domain.com/api/commands/pack
  ```
  ⚠️ **Replace `your-bot-domain.com` with your actual domain or ngrok URL**

### Step 6: HTTP Method
- **HTTP Method:** Select **"POST"** from dropdown

### Step 7: Request Body Template
- **Request Body Template:** Copy and paste this JSON (use double curly braces for variables):
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
        "text": "/pack",
        "message_id": "{{message_id}}"
      }
    }
  }
  ```
  
  **Important:** If the above doesn't work, try this simpler format:
  ```json
  {
    "user_id": "{{user_id}}",
    "chat_id": "{{chat_id}}",
    "message_id": "{{message_id}}",
    "username": "{{username}}",
    "text": "/pack"
  }
  ```

### Step 8: Headers (Optional)
- **Headers:** Copy and paste this JSON:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✗ **UNCHECKED** (this is a fast response)

### Step 10: Response Template (Optional)
- **Response Template:** Leave empty (bot will send response directly)

### Step 11: Save
- Click **"Save"** button at bottom right

---

## Command 2: `/batch` - Batch Convert

### Step 1: Create New Command
1. Click **"Add Command"** button again

### Step 2: Basic Information
- **Name:** `batch`
- **Description:** `Start batch conversion (up to 10 files)`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty (no parameters)

### Step 5: Service URL
- **Service URL:** 
  ```
  https://your-bot-domain.com/api/commands/batch
  ```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✓ **CHECKED** (this can take time)

### Step 10: Save
- Click **"Save"**

---

## Command 3: `/ai` - AI Video Sticker Maker

### Step 1: Create New Command
1. Click **"Add Command"**

### Step 2: Basic Information
- **Name:** `ai`
- **Description:** `AI Video Sticker Maker - create animated sticker`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty

### Step 5: Service URL
```
https://your-bot-domain.com/api/commands/ai
```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✓ **CHECKED**

### Step 10: Save
- Click **"Save"**

---

## Command 4: `/ai_image` - AI Image Sticker Maker

### Step 1: Create New Command
1. Click **"Add Command"**

### Step 2: Basic Information
- **Name:** `ai_image`
- **Description:** `AI Image Sticker Maker - create static PNG stickers`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty

### Step 5: Service URL
```
https://your-bot-domain.com/api/commands/ai_image
```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✓ **CHECKED**

### Step 10: Save
- Click **"Save"**

---

## Command 5: `/generate` - AI Generate Pack

### Step 1: Create New Command
1. Click **"Add Command"**

### Step 2: Basic Information
- **Name:** `generate`
- **Description:** `AI Generate Pack - create pack with AI`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty

### Step 5: Service URL
```
https://your-bot-domain.com/api/commands/generate
```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✓ **CHECKED**

### Step 10: Save
- Click **"Save"**

---

## Command 6: `/done` - Finish Batch

### Step 1: Create New Command
1. Click **"Add Command"**

### Step 2: Basic Information
- **Name:** `done`
- **Description:** `Finish batch and create pack`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty

### Step 5: Service URL
```
https://your-bot-domain.com/api/commands/done
```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✓ **CHECKED**

### Step 10: Save
- Click **"Save"**

---

## Command 7: `/help` - Help

### Step 1: Create New Command
1. Click **"Add Command"**

### Step 2: Basic Information
- **Name:** `help`
- **Description:** `Show help information`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty

### Step 5: Service URL
```
https://your-bot-domain.com/api/commands/help
```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✗ **UNCHECKED** (fast response)

### Step 10: Save
- Click **"Save"**

---

## Command 8: `/mypacks` - My Packs (Future)

### Step 1: Create New Command
1. Click **"Add Command"**

### Step 2: Basic Information
- **Name:** `mypacks`
- **Description:** `Show my sticker packs (future feature)`

### Step 3: Type & Integrations
- **Type:** **"Webhook"**
- **Integrations:** **"Telegram"** ✓

### Step 4: Parameters
- Leave empty

### Step 5: Service URL
```
https://your-bot-domain.com/api/commands/mypacks
```

### Step 6: HTTP Method
- **HTTP Method:** **"POST"**

### Step 7: Request Body Template
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

### Step 8: Headers
```json
{
  "Content-Type": "application/json"
}
```

### Step 9: Process Asynchronously
- **Process Asynchronously:** ✗ **UNCHECKED**

### Step 10: Save
- Click **"Save"**

---

## Summary Table

| Command | Name | Async | Description |
|---------|------|-------|-------------|
| `/pack` | `pack` | ✗ | Start the bot and see main menu |
| `/batch` | `batch` | ✓ | Start batch conversion (up to 10 files) |
| `/ai` | `ai` | ✓ | AI Video Sticker Maker |
| `/ai_image` | `ai_image` | ✓ | AI Image Sticker Maker |
| `/generate` | `generate` | ✓ | AI Generate Pack |
| `/done` | `done` | ✓ | Finish batch and create pack |
| `/help` | `help` | ✗ | Show help information |
| `/mypacks` | `mypacks` | ✗ | Show my sticker packs |

---

## Important Notes

1. **Service URL Format:** All commands use the same pattern:
   ```
   https://your-bot-domain.com/api/commands/{command_name}
   ```

2. **Request Body Template:** The template uses Memeputer's built-in variables:
   - `{{user_id}}` - Telegram user ID
   - `{{username}}` - Telegram username
   - `{{chat_id}}` - Telegram chat ID
   - `{{message_id}}` - Telegram message ID

3. **Headers:** All commands use the same headers (Content-Type: application/json)

4. **Process Asynchronously:**
   - ✓ Checked for: `/batch`, `/ai`, `/ai_image`, `/generate`, `/done` (long-running)
   - ✗ Unchecked for: `/pack`, `/help`, `/mypacks` (fast responses)

5. **Special Characters:** Command names with special characters should be URL-encoded in the service URL (e.g., `/pack!` would be `/pack%21`), but we're using `/pack` now so no encoding needed.

---

## Testing

After setting up all commands:

1. Test each command in Telegram
2. Check bot logs for webhook calls
3. Verify responses are sent correctly
4. Test file uploads (for batch, ai, ai_image commands)

---

## Troubleshooting

- **Command not responding:** Check service URL is accessible and correct
- **401 Unauthorized:** Verify bot service is running and can receive webhooks
- **Timeout errors:** Enable "Process Asynchronously" for slow commands
- **Wrong response:** Check request body template matches the format above

