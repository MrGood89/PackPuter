# Help Command Content for Memeputer

## Response Text for `/help` Command

Copy and paste this into the **Response Text** field in Memeputer's Edit Command modal:

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

## With Variables (Optional)

If you want to personalize it, you can use:

```
PackPuter Help 📖

Hi {{username}}! Here are the available commands:

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

## Description Field

**Description:** `Show help information`

This is what users see when they type `/help` in the command list.

