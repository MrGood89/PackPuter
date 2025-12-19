# Output Format Specification

**Purpose:** Define the exact JSON structure that PackPuter must return.

**Critical Rule:** Return ONLY a single valid JSON object. No markdown, no prose, no code fences, no nested JSON-as-a-string.

---

## Standard Output Structure

```json
{
  "version": "3.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "base_image_ref": "uploaded_image",
  "canvas": {
    "w": 512,
    "h": 512,
    "bg": "transparent"
  },
  "prompt": "<detailed prompt string>",
  "negative_prompt": "<negative prompt string>",
  "text": {
    "value": "<text string or empty>",
    "style": {
      "font_size": 100,
      "placement": "top|center|bottom",
      "stroke_width": 6,
      "color": "#FFFFFF"
    }
  },
  "constraints": {
    "transparent_bg_required": true,
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true,
    "subject_scale": "70-90%",
    "outline_required": true,
    "shadow_required": true
  }
}
```

---

## Field Descriptions

### `version` (string, required)
- **Value:** Always "3.0"
- **Purpose:** Indicates the contract version

### `type` (string, required)
- **Value:** Always "image_sticker"
- **Purpose:** Indicates this is an image sticker job (not video)

### `engine` (string, required)
- **Value:** Always "memeputer_i2i"
- **Purpose:** Indicates image-to-image generation (not procedural rendering)

### `base_image_ref` (string, required)
- **Value:** "uploaded_image" or the original `base_image_url`
- **Purpose:** Reference to the base image used for generation

### `canvas` (object, required)
- **Structure:**
  ```json
  {
    "w": 512,
    "h": 512,
    "bg": "transparent"
  }
  ```
- **Purpose:** Defines the output canvas dimensions and background

### `prompt` (string, required)
- **Type:** String (detailed prompt for image-to-image generation)
- **Must Include:**
  - Character description (based on base image and user context)
  - Action/pose (based on template or custom instructions)
  - Style requirements (transparent background, sticker cutout style)
  - Quality requirements (clean edges, white outline, subtle shadow)
  - Template-specific elements (if template_id is provided)
  - Character consistency (same face, outfit, proportions)
- **Length:** Typically 200-500 characters
- **Purpose:** Guides the image-to-image generation process

### `negative_prompt` (string, required)
- **Type:** String (what to avoid in the image)
- **Must Include:**
  - "background, scenery, environment, landscape"
  - "photorealistic humans, real people"
  - "logos, brands, watermarks"
  - "small text, unreadable text"
  - "multiple characters, crowds"
- **Length:** Typically 100-200 characters
- **Purpose:** Prevents unwanted elements in the generated image

### `text` (object, required)
- **Structure:**
  ```json
  {
    "value": "<text string or empty>",
    "style": {
      "font_size": 100,
      "placement": "top|center|bottom",
      "stroke_width": 6,
      "color": "#FFFFFF"
    }
  }
  ```
- **`value`:** The text to display (e.g., "GM", "HODL", or "" if no text)
- **`style.font_size`:** Font size in pixels (80-120px, depends on template)
- **`style.placement`:** Text placement ("top", "center", or "bottom")
- **`style.stroke_width`:** Stroke width in pixels (4-8px, depends on template)
- **`style.color`:** Text color (usually "#FFFFFF" for white, or "#000000" for black)
- **Purpose:** Defines text overlay (if template requires text)

### `constraints` (object, required)
- **Structure:**
  ```json
  {
    "transparent_bg_required": true,
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true,
    "subject_scale": "70-90%",
    "outline_required": true,
    "shadow_required": true
  }
  ```
- **Purpose:** Quality constraints for the generated image

---

## Error Output Structure

If something is missing, return ONLY:

```json
{
  "needs": ["field_name"],
  "hint": "Human-readable hint about what's needed"
}
```

**Important:** Only return `needs` if the field is actually missing from the request. If `base_image_url` is provided, you must fetch it - do not return `needs: ["base_image_url"]`.

---

## Examples

### Example 1: Template-Based (GM)
```json
{
  "version": "3.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "base_image_ref": "uploaded_image",
  "canvas": { "w": 512, "h": 512, "bg": "transparent" },
  "prompt": "A memeputer character (kind of puters, smart, innovative, beautiful) saying GM (Good Morning) with enthusiasm. The character is celebrating, energetic, positive morning vibe. Transparent background, sticker cutout style, 512x512, clean edges, white outline (15px), subtle shadow (10-20% opacity), single character only, same face and outfit as base image, consistent character identity. Subject occupies 70-90% of canvas height, centered, minimum 10% padding on all sides. Clean frame, no awkward cropping. Bold, readable GM text (120px, white, 8px stroke) prominently displayed at top center.",
  "negative_prompt": "background, scenery, environment, landscape, photorealistic humans, real people, logos, brands, watermarks, small text, unreadable text, multiple characters, crowds",
  "text": {
    "value": "GM",
    "style": {
      "font_size": 120,
      "placement": "top",
      "stroke_width": 8,
      "color": "#FFFFFF"
    }
  },
  "constraints": {
    "transparent_bg_required": true,
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true,
    "subject_scale": "70-90%",
    "outline_required": true,
    "shadow_required": true
  }
}
```

### Example 2: Custom Mode (No Template)
```json
{
  "version": "3.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "base_image_ref": "uploaded_image",
  "canvas": { "w": 512, "h": 512, "bg": "transparent" },
  "prompt": "A funny wizard character (unlimited power to pump and dump crypto) holding a sign saying HODL. The character is holding strong and confidently. Steady, stable pose, confident expression, solid stance. Transparent background, sticker cutout style, 512x512, clean edges, white outline (15px), subtle shadow (10-20% opacity), single character only, same face and outfit as base image, consistent character identity. Subject occupies 70-90% of canvas height, centered, minimum 10% padding on all sides. Clean frame, no awkward cropping. Bold, readable HODL text (110px, white, 6px stroke) prominently displayed at center.",
  "negative_prompt": "background, scenery, environment, landscape, photorealistic humans, real people, logos, brands, watermarks, small text, unreadable text, multiple characters, crowds",
  "text": {
    "value": "HODL",
    "style": {
      "font_size": 110,
      "placement": "center",
      "stroke_width": 6,
      "color": "#FFFFFF"
    }
  },
  "constraints": {
    "transparent_bg_required": true,
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true,
    "subject_scale": "70-90%",
    "outline_required": true,
    "shadow_required": true
  }
}
```

### Example 3: Custom Mode (No Text)
```json
{
  "version": "3.0",
  "type": "image_sticker",
  "engine": "memeputer_i2i",
  "base_image_ref": "uploaded_image",
  "canvas": { "w": 512, "h": 512, "bg": "transparent" },
  "prompt": "A funny wizard character (unlimited power to pump and dump crypto) celebrating with confetti. The character is excited and energetic, throwing confetti in the air. Transparent background, sticker cutout style, 512x512, clean edges, white outline (15px), subtle shadow (10-20% opacity), single character only, same face and outfit as base image, consistent character identity. Subject occupies 70-90% of canvas height, centered, minimum 10% padding on all sides. Clean frame, no awkward cropping. No text overlay.",
  "negative_prompt": "background, scenery, environment, landscape, photorealistic humans, real people, logos, brands, watermarks, small text, unreadable text, multiple characters, crowds",
  "text": {
    "value": "",
    "style": {
      "font_size": 100,
      "placement": "center",
      "stroke_width": 6,
      "color": "#FFFFFF"
    }
  },
  "constraints": {
    "transparent_bg_required": true,
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true,
    "subject_scale": "70-90%",
    "outline_required": true,
    "shadow_required": true
  }
}
```

### Example 4: Error (Missing base_image_url)
```json
{
  "needs": ["base_image_url"],
  "hint": "Provide a public HTTPS URL to the prepared base image asset (transparent PNG, 512x512)."
}
```

---

## Critical Rules

1. **Always return valid JSON** - no markdown, no prose, no code fences
2. **Never return nested JSON-as-a-string** - the response must be plain JSON
3. **Always include all required fields** - version, type, engine, base_image_ref, canvas, prompt, negative_prompt, text, constraints
4. **Always set `engine: "memeputer_i2i"`** - indicates image-to-image generation
5. **Always set `type: "image_sticker"`** - indicates image sticker (not video)
6. **Always set `base_image_ref: "uploaded_image"`** - or the original `base_image_url`
7. **Always include `text` object** - even if `value` is empty string
8. **Always include all constraints** - transparent_bg_required, no_photoreal_humans, etc.

---

**This output format is the single source of truth for PackPuter agent responses.**

