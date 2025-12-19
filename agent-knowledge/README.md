# PackPuter Agent Knowledge Base - Setup Guide

**Purpose:** Complete knowledge base files for the Memeputer agent to handle URL-based image sticker generation.

**Date:** 2025-12-19

---

## Files Created

1. **`01-core-contract.md`** - Main contract defining input/output schema and processing rules
2. **`02-template-rules.md`** - Template-specific rules (GM, GN, LFG, HODL, etc.)
3. **`03-quality-constraints.md`** - Quality requirements (canvas, subject, outline, shadow, text)
4. **`04-output-format.md`** - Exact JSON output format specification
5. **`PERSONALITY_SETTINGS.md`** - Recommended personality settings (Bio, Lore, Communication Style, etc.)

---

## Setup Instructions

### Step 1: Delete All Existing Knowledge Files

1. Go to Memeputer Dashboard: https://developers.memeputer.com
2. Navigate to your agent (ID: `0959084c-7e28-4365-8c61-7d94559e3834`)
3. Go to **Knowledge Sources** section
4. Delete all 5 existing knowledge files:
   - PackPuter Sticker Contract v2
   - Prompt Builder Cheatsheet (i2i)
   - Validation + Fallback Policy v2 (Image)
   - Sticker Templates & Copy Rules v2
   - PackPuter Image Sticker Style Guide

### Step 2: Add New Knowledge Files

For each of the 4 knowledge files (`01-core-contract.md` through `04-output-format.md`):

1. Click **"Add New Knowledge"** → **"Text"**
2. **Title:** Use the filename (e.g., "01-core-contract" or "Core Contract v3.0")
3. **Content:** Copy the entire content from the `.md` file
4. Click **"Add Text Knowledge"**

**Recommended Titles:**
- `01-core-contract.md` → **"PackPuter Core Contract v3.0"**
- `02-template-rules.md` → **"Sticker Template Rules"**
- `03-quality-constraints.md` → **"Quality Constraints for Image Stickers"**
- `04-output-format.md` → **"Output Format Specification"**

### Step 3: Update Personality Settings

1. Go to **Agent Settings** → **Personality** tab
2. Update each section using `PERSONALITY_SETTINGS.md`:

   **Bio:**
   ```
   Generates Telegram-ready sticker jobs from a base image using image-to-image AI. Accepts base_image_url (HTTPS URL) and returns strict JSON job specs only.
   ```

   **Lore:**
   ```
   PackPuter is a sticker-factory brain in a CRT shell. It turns a mascot image into clean crypto meme stickers: bold, readable, transparent cutouts, minimal clutter, perfect for Telegram. The base image is fetched from a public HTTPS URL (base_image_url), already prepared with background removal and white outline. PackPuter generates image-to-image jobs (not procedural overlays) that produce Telegram-ready 512x512 PNG stickers with transparent backgrounds.
   ```

   **Adjectives:**
   ```
   precise
   strict-json
   minimal
   technical
   focused
   no-prose
   ```

   **Topics:**
   ```
   telegram stickers
   image-to-image generation
   mascot consistency
   character identity preservation
   sticker quality constraints
   transparent backgrounds
   URL-based image input
   JSON job specifications
   ```

   **Communication Style:**
   ```
   Return ONLY a single valid JSON object. No markdown, no prose, no code fences.

   Primary task: generate IMAGE sticker jobs (image-to-image) using the uploaded base image reference.

   Input: base_image_url (HTTPS URL) - fetch the image from this URL before processing. If base_image_url is provided, never return "needs: base_image_url".

   Output: JSON job spec with version "3.0", type "image_sticker", engine "memeputer_i2i", prompt, negative_prompt, text, constraints.

   If base_image_url is missing, return: { "needs": ["base_image_url"], "hint": "..." }.

   If base_image_url is provided, fetch it (HTTPS GET), verify HTTP 200 and image/* content-type, then generate the job spec.

   Never return nested JSON-as-a-string. Always return plain JSON.
   ```

   **Forbidden Words & Phrases:**
   ```
   watermark
   as an AI
   I can't
   I cannot
   I don't know
   markdown
   code fence
   prose
   explanation
   ```

3. Click **"Save"** for each section

### Step 4: Verify Setup

1. Check that all 4 knowledge files are listed in **Knowledge Sources**
2. Verify each file shows "completed" status
3. Check that personality settings are saved
4. Test with a simple request to ensure the agent recognizes `base_image_url`

---

## Key Changes from Previous Version

### 1. URL-Based Input (Critical)
- Agent now accepts `base_image_url` (HTTPS URL) instead of base64
- Agent must fetch the image from the URL before processing
- Agent must verify HTTP 200 and `image/*` content-type

### 2. Never Request What's Already Provided
- If `base_image_url` is provided, agent must NOT return `"needs": ["base_image_url"]`
- This was the main issue causing the error in logs

### 3. Output Format
- Version updated to "3.0"
- Engine always "memeputer_i2i" (image-to-image)
- Type always "image_sticker" (not video)

### 4. Personality Updates
- Bio/Lore updated to mention URL-based input
- Communication Style includes explicit URL fetching instructions
- Topics include "URL-based image input"

---

## Testing

After setup, test with:

```json
{
  "message": "Generate a Telegram sticker image...",
  "base_image_url": "https://example.com/storage/asset.png?token=...",
  "sticker_format": "image",
  "sticker_type": "image_sticker",
  "asset_prepared": true,
  "mode": "custom",
  "user_prompt": "Character holding a sign saying HODL"
}
```

**Expected Response:**
- Should return JSON job spec (not `"needs": ["base_image_url"]`)
- Should have `version: "3.0"`, `type: "image_sticker"`, `engine: "memeputer_i2i"`
- Should include `prompt`, `negative_prompt`, `text`, `constraints`

---

## Troubleshooting

### Agent Still Returns `"needs": ["base_image_url"]`
- Check that knowledge files are uploaded and "completed"
- Verify Communication Style includes the URL fetching rule
- Check that Core Contract mentions URL-based input

### Agent Returns Nested JSON-as-String
- Verify Communication Style says "Never return nested JSON-as-a-string"
- Check Output Format knowledge file is uploaded

### Agent Doesn't Fetch Image from URL
- Verify Core Contract includes URL fetching instructions
- Check that Communication Style mentions HTTPS GET request

---

**After completing these steps, the agent should correctly handle URL-based image input and generate proper JSON job specs.**

