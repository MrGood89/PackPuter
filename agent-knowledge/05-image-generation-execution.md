# Image Generation Execution Guide

**Purpose:** This document explains how PackPuter must ACTUALLY GENERATE images, not just return job specs.

**Critical:** When you return a job spec with `engine: "memeputer_i2i"`, you are telling the caller that you will generate the image. However, the caller expects you to ACTUALLY GENERATE the image and return the image URL directly.

---

## The Problem

Currently, PackPuter returns job specs like this:
```json
{
  "version": "3.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "prompt": "...",
  "negative_prompt": "...",
  ...
}
```

But the caller needs the ACTUAL GENERATED IMAGE URL, not just the job spec.

---

## The Solution: Two-Step Process

### Step 1: Return Job Spec (Current Behavior)
When you receive a request with `base_image_url`, you should:
1. Fetch the image from the URL
2. Analyze the image and user requirements
3. Generate a job spec with `engine: "memeputer_i2i"`

**BUT** - if the caller explicitly asks you to generate the image (e.g., "Generate the image NOW and return ONLY the image URL"), proceed to Step 2.

### Step 2: Actually Generate the Image (NEW BEHAVIOR)
When you receive a follow-up request asking you to generate the image, or when you're explicitly told to generate it:

1. **Use the job spec you created** (from Step 1 or from the request)
2. **Call Memeputer's Image Generation API** with the job spec parameters:
   - Use the `prompt` from the job spec
   - Use the `negative_prompt` from the job spec
   - Use the `base_image_url` from the original request
   - Set `width: 512`, `height: 512`
   - Set `n: 1` (generate one image)
   - Set `response_format: "url"`

3. **Extract the image URL** from the API response
   - The API will return something like: `{ "data": [{ "url": "https://..." }] }` or `{ "url": "https://..." }`
   - Extract the URL from the response

4. **Return ONLY the image URL** in your response:
   ```json
   {
     "image_url": "https://example.com/generated-image.png"
   }
   ```
   
   OR return it as plain text:
   ```
   https://example.com/generated-image.png
   ```

---

## When to Generate vs. When to Return Job Spec

### Return Job Spec When:
- First request with `base_image_url`
- User asks for a "job spec" or "blueprint"
- User asks "what would you generate?"

### Actually Generate Image When:
- Follow-up request explicitly says "generate the image NOW"
- Follow-up request says "return ONLY the image URL"
- Follow-up request says "DO NOT return another job spec"
- User asks "generate it" or "create it"

---

## Example Flow

### Request 1: Initial Request
**Request:**
```json
{
  "message": "Generate a Telegram sticker image. Custom instructions: Character holding a sign saying HODL.",
  "base_image_url": "https://example.com/asset.png",
  "mode": "custom",
  "user_prompt": "Character holding a sign saying HODL"
}
```

**Your Response (Job Spec):**
```json
{
  "version": "3.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "base_image_ref": "uploaded_image",
  "canvas": { "w": 512, "h": 512, "bg": "transparent" },
  "prompt": "A character holding a sign saying HODL...",
  "negative_prompt": "background, scenery...",
  "text": { "value": "HODL", "style": {...} },
  "constraints": {...}
}
```

### Request 2: Follow-Up Request (Generate Image)
**Request:**
```json
{
  "message": "IMPORTANT: Generate the image NOW and return ONLY the image URL. DO NOT return another job spec. You have the job spec already. Use it to generate the image using Memeputer's image generation service, then return ONLY the HTTPS URL to the generated PNG image.",
  "base_image_url": "https://example.com/asset.png"
}
```

**Your Response (Image URL):**
```json
{
  "image_url": "https://generated-images.memeputer.com/abc123.png"
}
```

OR as plain text:
```
https://generated-images.memeputer.com/abc123.png
```

---

## Memeputer Image Generation API

**Endpoint:** (You need to determine the correct endpoint from Memeputer's API documentation)

Possible endpoints:
- `/api/v1/images/generate`
- `/api/v1/agents/{agentId}/generate-image`
- `/v1/images/generations`

**Request Format:**
```json
{
  "prompt": "<prompt from job spec>",
  "negative_prompt": "<negative_prompt from job spec>",
  "base_image_url": "<base_image_url from original request>",
  "width": 512,
  "height": 512,
  "n": 1,
  "response_format": "url"
}
```

**Response Format (typical):**
```json
{
  "data": [
    {
      "url": "https://generated-images.memeputer.com/abc123.png"
    }
  ]
}
```

OR:
```json
{
  "url": "https://generated-images.memeputer.com/abc123.png"
}
```

---

## Critical Rules

1. **If asked to generate the image**, you MUST actually call the image generation API
2. **Do NOT return another job spec** when explicitly asked to generate
3. **Return ONLY the image URL** when generating (no JSON structure, just the URL)
4. **If you cannot generate images** (API unavailable, no access), return an error:
   ```json
   {
     "error": "Image generation is not available. Please contact Memeputer support."
   }
   ```

---

## Implementation Notes

- You may need to use Memeputer's tools/commands to generate images
- Check if there's a `/generate-image` command available
- The image generation API may require authentication (use your API key)
- The generated image URL should be publicly accessible (HTTPS)

---

**This guide explains how PackPuter should actually execute image generation, not just return job specs.**

