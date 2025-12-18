# Memeputer JSON Request Body Templates - Fixed

If you're getting "Invalid JSON in webhook body template" errors, try these corrected templates.

## Option 1: Full Telegram Update Format (Recommended)

Use this if your bot expects full Telegram update format:

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

**Key changes:**
- All variable values are wrapped in quotes: `"{{user_id}}"` instead of `{{user_id}}`
- This makes it valid JSON even before Memeputer replaces the variables

---

## Option 2: Simplified Format (If Option 1 doesn't work)

Use this simpler format if your bot can handle it:

```json
{
  "user_id": "{{user_id}}",
  "chat_id": "{{chat_id}}",
  "message_id": "{{message_id}}",
  "username": "{{username}}",
  "text": "/pack"
}
```

---

## Option 3: Minimal Format (Simplest)

If both above fail, try this minimal format:

```json
{
  "text": "/pack",
  "user_id": "{{user_id}}",
  "chat_id": "{{chat_id}}"
}
```

---

## All Commands - Corrected Templates

### Command: `/pack`
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

### Command: `/batch`
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

### Command: `/ai`
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

### Command: `/ai_image`
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

### Command: `/generate`
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

### Command: `/done`
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

### Command: `/help`
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

### Command: `/mypacks`
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

---

## Common Issues & Solutions

### Issue 1: "Invalid JSON" Error
**Solution:** Make sure all variable values are in quotes:
- ✅ Correct: `"id": "{{user_id}}"`
- ❌ Wrong: `"id": {{user_id}}`

### Issue 2: Variables Not Replacing
**Solution:** Check that you're using Memeputer's built-in variables:
- `{{user_id}}` - Telegram user ID
- `{{chat_id}}` - Telegram chat ID
- `{{message_id}}` - Telegram message ID
- `{{username}}` - Telegram username

### Issue 3: Still Getting Errors
**Solution:** Try the simplified format (Option 2) or minimal format (Option 3) above.

---

## Testing

After setting up a command:
1. Save the command in Memeputer
2. Test it in Telegram
3. Check your bot logs to see what format the webhook is sending
4. Adjust the template based on what your bot actually receives

---

## Alternative: Check Memeputer Documentation

If none of these work, check Memeputer's documentation for:
- Exact variable syntax they support
- Example webhook templates
- JSON validation requirements

