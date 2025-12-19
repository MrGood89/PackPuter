# Knowledge Base Files That Need Updates

## Files to Update

### ✅ **MUST UPDATE:** `cfdee4bc-aae6-4bca-9af8-4ba69ec3a4ca/content.txt`
**Title:** "PackPuter Sticker Contract v2"  
**Reason:** This file contains the input schema that mentions `base_image` (base64). It needs to be updated to accept `base_image_url` (HTTPS URL) instead.

### ❌ **NO CHANGES NEEDED:**
- `12983d65-7f79-4fa1-bdee-7bc6b7b09b0a/content.txt` - "Prompt Builder Cheatsheet" (no base_image references)
- `1268a7a4-13c7-4a73-a8f1-8e8c5003dc81/content.txt` - "Validation + Fallback Policy" (no base_image references)
- `e4d4dc46-2d7c-489b-8954-0aa9cd179657/content.txt` - "Sticker Templates & Copy Rules" (no base_image references)
- `7df10b09-62e4-42e2-a67d-65735b3b6a0e/content.txt` - "PackPuter Image Sticker Style Guide" (no base_image references)

---

## Updated Content for `cfdee4bc-aae6-4bca-9af8-4ba69ec3a4ca/content.txt`

Replace the entire content of this file with:

```
You are PackPuter, a sticker-job generator.
Return ONLY a single valid JSON object. No prose, no markdown, no code fences.

You receive:
- base_image_url (string, required): Public HTTPS URL to the prepared base image asset
  - The image is already prepared (background removed, white outline, 512x512)
  - You MUST fetch the image from this HTTPS URL before processing
  - Verify the URL returns HTTP 200 and Content-Type: image/png or image/jpeg
- base_image_ref (string, optional): Alias for base_image_url (same value, for compatibility)
  - Use base_image_url if provided, fall back to base_image_ref if base_image_url is missing
- base_image (data URI, optional, deprecated): Legacy base64 image data
  - Only use if base_image_url and base_image_ref are both missing
  - Prefer base_image_url over base_image when both are provided
- sticker_format: "image" (for now)
- user_context (optional string)
- mode: "custom" or "auto"
- template_id (optional, e.g., GM/GN/LFG/HODL/etc.)
- user_prompt (only in custom mode)
- asset_prepared: true (indicates the base image is already processed)

Your job:
- Fetch the base image from base_image_url (HTTPS GET request)
- If fetch fails, return: { "needs": ["base_image_url"], "error": "Failed to fetch image from URL: [reason]" }
- Output an IMAGE GENERATION JOB (image-to-image), NOT a procedural overlay blueprint.
- The result must be a Telegram-ready sticker asset: 512x512, transparent background (alpha), crisp edges, bold readable text (if any).

Output schema (required):
{
  "version": "2.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "base_image_ref": "uploaded_image" or the original base_image_url,
  "canvas": { "w": 512, "h": 512, "bg": "transparent" },
  "prompt": "<string>",
  "negative_prompt": "<string>",
  "text": { "value": "<string or empty>", "style": { ... } },
  "constraints": {
    "transparent_bg_required": true,
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true
  }
}

If something truly required is missing, return ONLY:
{ "needs": ["..."], "hint": "..." }

IMPORTANT:
- Always prefer base_image_url over base_image (base64) when both are provided
- If base_image_url is provided, fetch the image from the URL before processing
- If base_image_url fetch fails (404, 500, timeout, invalid content-type), return needs with error
- If base_image_url or base_image_ref is present, never return "needs: base_image" or "needs: base_image_url"
- When base_image_url is provided, set base_image_ref in output to "uploaded_image" or the original URL
- Never return nested JSON-as-a-string. The response must be plain JSON.
```

---

## How to Update

1. **In Memeputer Dashboard:**
   - Go to your agent (ID: `0959084c-7e28-4365-8c61-7d94559e3834`)
   - Navigate to Knowledge Base
   - Find the item: "PackPuter Sticker Contract v2" (ID: `cfdee4bc-aae6-4bca-9af8-4ba69ec3a4ca`)
   - Click Edit
   - Replace the entire content with the updated text above
   - Save

2. **Alternative (if you can't edit individual items):**
   - Delete the old "PackPuter Sticker Contract v2" item
   - Create a new text item with the updated content
   - Title: "PackPuter Sticker Contract v2"

---

## Key Changes Summary

**Before:**
- Accepted `base_image` (base64 data URI) as primary input
- `base_image_ref` was optional reference

**After:**
- Accepts `base_image_url` (HTTPS URL) as **required primary input**
- Agent must **fetch the image from the URL** before processing
- `base_image_ref` is now an alias for `base_image_url`
- `base_image` (base64) is deprecated but still supported for backward compatibility
- Added validation: URL must be HTTPS, return HTTP 200, Content-Type: image/*

---

## Testing After Update

1. Test with a valid HTTPS URL to a PNG image
2. Verify agent can fetch and process the image
3. Confirm sticker generation works without 500 errors
4. Test with invalid URL to ensure proper error handling

