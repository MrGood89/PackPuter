# Memeputer Agent Knowledge Update for Image Stickers

## Required Changes

The Memeputer agent needs to be updated to accept `base_image_url` instead of (or in addition to) `base_image` for image sticker generation.

### Current Behavior (Causing 500 Errors)
- Agent expects `base_image` as base64 string in JSON body
- This causes 500 errors when large base64 payloads are sent

### New Behavior (URL-Based)
- Agent should accept `base_image_url` (preferred) or `base_image_ref` as HTTPS URL
- Agent should fetch the image from the URL instead of expecting base64

## Agent Knowledge Update

Add the following to the agent's knowledge base:

### Input Schema for Image Sticker Generation

```json
{
  "message": "string (required) - The prompt/instructions for sticker generation",
  "base_image_url": "string (required) - Public HTTPS URL to the prepared asset PNG",
  "base_image_ref": "string (optional) - Alias for base_image_url (for compatibility)",
  "sticker_format": "image",
  "sticker_type": "image_sticker",
  "asset_prepared": true,
  "mode": "custom" | "auto",
  "user_prompt": "string (optional) - Custom instructions for single sticker",
  "template_id": "string (optional) - Template ID (GM, GN, LFG, etc.)",
  "user_context": "string (optional) - Project/coin/mascot context"
}
```

### Agent Instructions

1. **When `base_image_url` is provided:**
   - Fetch the image from the HTTPS URL
   - Verify the URL returns a valid image (Content-Type: image/png or image/jpeg)
   - Use the fetched image as the base for sticker generation

2. **Image Requirements:**
   - The image is already prepared (transparent background, white outline, 512x512)
   - Use the exact character from the base image
   - Maintain character identity (same face, outfit, proportions)

3. **Output Format:**
   - Return `{ "type": "image_sticker", "image_url": "..." }` with the generated sticker URL
   - OR return the image directly if supported

### Example Request

```json
{
  "message": "Generate a Telegram sticker image. Custom instructions: Character taking stickers from magic hat...",
  "base_image_url": "https://your-project.supabase.co/storage/v1/object/sign/sticker-assets/memeputer/6656015198/session_1234567890/1234567890_asset.png?token=...",
  "base_image_ref": "https://your-project.supabase.co/storage/v1/object/sign/sticker-assets/memeputer/6656015198/session_1234567890/1234567890_asset.png?token=...",
  "sticker_format": "image",
  "sticker_type": "image_sticker",
  "asset_prepared": true,
  "mode": "custom",
  "user_prompt": "Character taking stickers from magic hat",
  "user_context": "Packputer, best puter who is creating packets full of funny stickers"
}
```

### Migration Notes

- **Backward Compatibility:** Agent can still accept `base_image` (base64) for now, but `base_image_url` is preferred
- **URL Validation:** Agent should validate that the URL:
  - Uses HTTPS protocol
  - Returns HTTP 200 status
  - Has Content-Type starting with `image/`
- **Error Handling:** If URL is inaccessible, return clear error: `{ "needs": ["base_image_url"], "error": "Failed to fetch image from URL" }`

## Testing

After updating the agent knowledge:

1. Test with a valid HTTPS URL to a PNG image
2. Verify the agent can fetch and process the image
3. Confirm sticker generation works without 500 errors
4. Test with invalid URL to ensure proper error handling

