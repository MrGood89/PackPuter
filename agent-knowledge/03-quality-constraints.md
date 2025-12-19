# Quality Constraints for Image Stickers

**Purpose:** Define strict quality requirements that all generated image stickers must meet.

**Usage:** Include these constraints in the output JSON to guide the image generation process.

---

## Canvas Requirements

- **Dimensions:** Exactly 512×512 pixels
- **Aspect Ratio:** 1:1 (square)
- **Background:** Fully transparent (alpha channel required)
- **Color Space:** sRGB with alpha channel

**In Output:**
```json
{
  "canvas": {
    "w": 512,
    "h": 512,
    "bg": "transparent"
  }
}
```

---

## Subject Requirements

### Scale & Placement
- **Subject Height:** 70–90% of canvas height (358–461 pixels)
- **Subject Width:** Proportional, but must fit within canvas
- **Position:** Centered horizontally and vertically
- **Padding:** Minimum 10% margin on all sides

### Composition
- **Single Primary Object:** One main subject (character, mascot, object)
- **No Background Scenery:** Transparent background only
- **No Props:** Minimal supporting elements (only if essential to template)
- **Clean Frame:** Subject fills frame appropriately, no awkward cropping

**In Prompt:**
- "Single character only, no extra people or objects"
- "Subject occupies 70-90% of canvas height, centered"
- "Minimum 10% padding on all sides"
- "Clean frame, no awkward cropping"

---

## Outline Requirements

- **Color:** White (#FFFFFF)
- **Width:** 12–18 pixels (scales with subject size)
  - Small subjects (70% height): 12px
  - Medium subjects (80% height): 15px
  - Large subjects (90% height): 18px
- **Anti-aliasing:** Smooth, clean edges (no jagged lines)
- **Position:** Outside subject bounds (outline stroke)

**In Prompt:**
- "Clean white outline, 12-18px width, smooth edges"
- "Crisp edges, no jagged lines"
- "Outline stroke outside subject bounds"

**In Constraints:**
```json
{
  "constraints": {
    "outline_required": true
  }
}
```

---

## Shadow Requirements

- **Type:** Subtle inner shadow OR very soft outer shadow
- **Position:** Inside outline only (preferred) or 2–4px offset outer
- **Blur:** 4–8px Gaussian blur
- **Opacity:** 10–20% (subtle, not overpowering)
- **Color:** Black or dark gray (#000000 with 10–20% alpha)

**In Prompt:**
- "Subtle shadow for depth, 10-20% opacity"
- "Sticker cutout aesthetic, subject pops from transparent background"

**In Constraints:**
```json
{
  "constraints": {
    "shadow_required": true
  }
}
```

---

## Text Requirements (if applicable)

### Size & Style
- **Font Size:** 80–120px (depends on template)
- **Max Lines:** 1–2 lines maximum
- **Stroke/Outline:** Required (4–8px white stroke)
- **Contrast:** High contrast (white text on dark subject, or dark text with white stroke)
- **Placement:** Top, center, or bottom (per template rules)
- **Readability:** Must be readable at small sizes (Telegram thumbnail)

**In Output:**
```json
{
  "text": {
    "value": "GM",
    "style": {
      "font_size": 120,
      "placement": "top",
      "stroke_width": 8,
      "color": "#FFFFFF"
    }
  }
}
```

**In Prompt:**
- "Bold, readable text, high contrast"
- "Text must be readable at thumbnail size"
- "White stroke on text for visibility"

**In Constraints:**
```json
{
  "constraints": {
    "no_small_text": true
  }
}
```

---

## Background Requirements

- **Transparent Background:** Required (no scenery, no environment)
- **No Background Elements:** No landscapes, rooms, or environments
- **Plain Studio/Chroma:** If background is needed for generation, use plain studio or solid chroma background (will be removed in post-processing)

**In Prompt:**
- "Transparent background, no scenery, no background, no environment"
- "Plain studio background or solid chroma background (will be removed)"
- "Single character only, no background elements"

**In Negative Prompt:**
- "background, scenery, environment, landscape, room, indoor, outdoor"

**In Constraints:**
```json
{
  "constraints": {
    "transparent_bg_required": true
  }
}
```

---

## Character Consistency Requirements

- **Same Face:** Character must have the same face as the base image
- **Same Outfit:** Character must wear the same outfit as the base image
- **Same Proportions:** Character must have the same body proportions as the base image
- **Identity Preservation:** Character identity must be consistent across all generations

**In Prompt:**
- "Use the exact same character from the base image (same face, same outfit, same proportions)"
- "Keep character identity consistent"
- "Same face, same outfit, same proportions as base image"

---

## Forbidden Elements

### Never Include:
- **Photorealistic Humans:** No real people, only stylized characters
- **Logos/Brands:** No brand names, logos, or watermarks
- **Small Text:** No tiny, unreadable text
- **Multiple Characters:** Single character only, no crowds
- **Background Scenery:** No landscapes, rooms, or environments

**In Negative Prompt:**
- "photorealistic humans, real people, logos, brands, watermarks, small text, unreadable text, multiple characters, crowds, background, scenery, environment, landscape"

**In Constraints:**
```json
{
  "constraints": {
    "no_photoreal_humans": true,
    "no_logos_no_brands": true,
    "no_small_text": true
  }
}
```

---

## Complete Constraints Object

Always include this in your output:

```json
{
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

## Prompt Construction Guidelines

When building the `prompt` field, always include:

1. **Character Description:** Based on the base image and user context
2. **Action/Pose:** Based on template or custom instructions
3. **Style Requirements:** Transparent background, sticker cutout style
4. **Quality Requirements:** Clean edges, white outline, subtle shadow
5. **Template-Specific Elements:** If template_id is provided
6. **Character Consistency:** Same face, outfit, proportions

**Example Complete Prompt:**
```
A funny wizard character (unlimited power to pump and dump crypto) holding a sign saying HODL. The character is holding strong and confidently. Steady, stable pose, confident expression, solid stance. Transparent background, sticker cutout style, 512x512, clean edges, white outline (15px), subtle shadow (10-20% opacity), single character only, same face and outfit as base image, consistent character identity. Subject occupies 70-90% of canvas height, centered, minimum 10% padding on all sides. Clean frame, no awkward cropping. Bold, readable HODL text (110px, white, 6px stroke) prominently displayed at center.
```

---

**These quality constraints ensure all generated stickers meet Telegram's requirements and maintain professional quality.**

