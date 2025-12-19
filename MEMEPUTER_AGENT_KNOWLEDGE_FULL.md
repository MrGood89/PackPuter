# Memeputer Agent Knowledge Base - Full Text

## Where to Update

**Location:** Memeputer Dashboard → Your Agent (ID: `0959084c-7e28-4365-8c61-7d94559e3834`) → **Knowledge Base** or **Instructions** tab

**Action:** Replace or update the existing knowledge base section about image sticker generation with the text below.

---

## Full Knowledge Base Text (Copy-Paste Ready)

```
# Image Sticker Generation

## Input Schema

When generating image stickers, the agent receives the following JSON payload:

```json
{
  "message": "string (required) - The prompt/instructions for sticker generation",
  "base_image_url": "string (required) - Public HTTPS URL to the prepared asset PNG",
  "base_image_ref": "string (optional) - Alias for base_image_url (same value, for compatibility)",
  "sticker_format": "image",
  "sticker_type": "image_sticker",
  "asset_prepared": true,
  "mode": "custom" | "auto",
  "user_prompt": "string (optional) - Custom instructions for single sticker (when mode=custom)",
  "template_id": "string (optional) - Template ID like GM, GN, LFG, HODL, WAGMI, etc. (when mode=auto)",
  "user_context": "string (optional) - Project/coin/mascot context and style preferences"
}
```

## Processing Steps

1. **Extract base_image_url:**
   - Use `base_image_url` if provided (preferred)
   - Fall back to `base_image_ref` if `base_image_url` is missing
   - The URL must be HTTPS and publicly accessible

2. **Fetch the base image:**
   - Make HTTP GET request to the `base_image_url`
   - Verify response status is 200
   - Verify Content-Type is `image/png` or `image/jpeg`
   - The image is already prepared: transparent background, white outline, 512x512 pixels

3. **Generate sticker:**
   - Use the fetched image as the base character
   - Follow the instructions in `message` and `user_prompt` (if provided)
   - For template mode: use `template_id` to determine the sticker type (GM, GN, LFG, etc.)
   - Maintain character identity: same face, same outfit, same proportions as base image
   - Output must be: transparent background, 512x512 PNG with alpha channel

4. **Return response:**
   - Return JSON: `{ "type": "image_sticker", "image_url": "https://..." }`
   - OR return the image directly if the API supports it
   - If image URL is inaccessible, return: `{ "needs": ["base_image_url"], "error": "Failed to fetch image from URL: [reason]" }`

## Image Requirements

- **Base Image:** Already prepared with transparent background, white outline, 512x512
- **Output:** Must maintain character identity (same face, outfit, proportions)
- **Background:** Always transparent (no scenery, no environment)
- **Format:** PNG with alpha channel
- **Size:** 512x512 pixels
- **Style:** Clean sticker cutout style

## Example Request

```json
{
  "message": "Generate a Telegram sticker image. Custom instructions: Character taking stickers from magic hat. The base image is a prepared character asset (transparent background, white outline, already cut out). Generate the sticker showing the character performing the action described in the custom instructions. Requirements: - Use the exact same character from the base image (same face, same outfit, same proportions) - Transparent background (no scenery, no background, no environment) - Clean sticker cutout style - 512x512 pixels - PNG format with alpha channel - Single character only, no extra people or objects - Keep character identity consistent - Return the image as a URL or base64.",
  "base_image_url": "https://your-project.supabase.co/storage/v1/object/sign/sticker-assets/memeputer/6656015198/session_1766180241992/1766180241992_asset.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "base_image_ref": "https://your-project.supabase.co/storage/v1/object/sign/sticker-assets/memeputer/6656015198/session_1766180241992/1766180241992_asset.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sticker_format": "image",
  "sticker_type": "image_sticker",
  "asset_prepared": true,
  "mode": "custom",
  "user_prompt": "Character taking stickers from magic hat",
  "user_context": "Packputer, best puter who is creating packets full of funny stickers"
}
```

## Error Handling

- If `base_image_url` is missing or invalid: return `{ "needs": ["base_image_url"] }`
- If URL is not HTTPS: return error "base_image_url must use HTTPS protocol"
- If URL fetch fails (404, 500, timeout): return `{ "needs": ["base_image_url"], "error": "Failed to fetch image from URL: [HTTP status] [reason]" }`
- If Content-Type is not image/*: return error "URL does not return a valid image (Content-Type: [type])"

## Backward Compatibility

- If `base_image` (base64) is provided instead of `base_image_url`, you can still process it, but `base_image_url` is preferred
- Always prefer `base_image_url` over `base_image` when both are provided
```

---

## Alternative: Minimal Update (If Full Replacement Not Possible)

If you can only add a small note to existing knowledge, add this:

```
IMPORTANT: For image sticker generation, the agent now accepts `base_image_url` (HTTPS URL) instead of `base_image` (base64). 

When `base_image_url` is provided:
1. Fetch the image from the HTTPS URL
2. Verify it returns HTTP 200 and Content-Type: image/png or image/jpeg
3. Use the fetched image as the base for sticker generation
4. Return { "type": "image_sticker", "image_url": "..." } with the generated sticker

The base image is already prepared (transparent background, white outline, 512x512).
```

---

## Verification Checklist

After updating the knowledge base:

- [ ] Agent accepts `base_image_url` field
- [ ] Agent can fetch images from HTTPS URLs
- [ ] Agent validates URL accessibility (HTTP 200, image/* content-type)
- [ ] Agent returns proper error if URL is inaccessible
- [ ] Sticker generation works without 500 errors
- [ ] Generated stickers maintain character identity

