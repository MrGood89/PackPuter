# Memeputer Text Commands - Response Text

For `/start` and `/help` commands, use **"Text"** type (not Webhook) and set the Response Text below.

---

## Command: `/start` - Response Text

Since `/start` is Memeputer's default command, edit it with this response:

```
Welcome to PackPuter! 🧠📦

I can help you:
• Convert GIFs/videos to Telegram stickers
• Generate AI-powered animated stickers
• Create sticker packs automatically

Use /pack to see the main menu, or type /help for all commands.
```

**Or if you want to redirect to /pack:**
```
Welcome! Use /pack to start.
```

---

## Command: `/help` - Response Text

Edit the existing `/help` command with this response:

```
PackPuter Help 📖

Commands:
/pack - Start the bot and see main menu
/batch - Upload up to 10 GIFs/videos, convert them all, and create a pack
/ai - AI Video Sticker Maker: Send a base image, choose a template
/ai_image - AI Image Sticker Maker: Create static PNG stickers
/generate - AI Generate Pack: Generate a full sticker pack (6 or 12 stickers)
/done - Finish batch and proceed to pack creation

All stickers meet Telegram requirements:
• WEBM VP9 format (video) or PNG (static)
• ≤ 3 seconds (video)
• ≤ 30 fps (video)
• 512px max dimension
• ≤ 256 KB
```

---

## Setup Instructions

### For `/start` Command:
1. Go to Memeputer → Commands → Find `/start` command
2. Click "Edit" (or it might already be open)
3. **Type:** Should be "Text" (not Webhook)
4. **Response Text:** Paste the text above
5. Click "Save"

### For `/help` Command:
1. Go to Memeputer → Commands → Find `/help` command
2. Click "Edit"
3. **Type:** Should be "Text" (not Webhook)
4. **Response Text:** Paste the help text above
5. Click "Save"

---

## Variables You Can Use

In the Response Text, you can use these variables:
- `{{username}}` - User's Telegram username
- `{{agent_name}}` - Your agent's name
- `{{user_id}}` - User's Telegram ID

Example:
```
Welcome {{username}}! Use /pack to start.
```

