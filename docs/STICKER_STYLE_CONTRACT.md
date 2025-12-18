# Sticker Style Contract

**Version:** 1.0  
**Last Updated:** 2025-01-18  
**Status:** Canonical - All sticker outputs MUST comply

This document defines the **single source of truth** for all Telegram sticker outputs from PackPuter. Every sticker created by any AI flow must pass this contract.

---

## 1. Canvas Requirements

### Dimensions
- **Size:** Exactly 512×512 pixels
- **Aspect Ratio:** 1:1 (square)
- **Background:** Fully transparent (alpha channel required)
- **Color Space:** sRGB with alpha channel

### Validation
```python
assert width == 512
assert height == 512
assert has_alpha_channel == True
assert background_is_transparent == True
```

---

## 2. Subject Requirements

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

### Validation
```python
subject_bbox = detect_subject_bounds(image)
subject_height = subject_bbox.height
canvas_height = 512

assert 0.70 <= (subject_height / canvas_height) <= 0.90
assert is_centered(subject_bbox, tolerance=5)
assert padding_percent >= 10
```

---

## 3. Outline Requirements

### Style
- **Color:** White (#FFFFFF)
- **Width:** 12–18 pixels (scales with subject size)
  - Small subjects (70% height): 12px
  - Medium subjects (80% height): 15px
  - Large subjects (90% height): 18px
- **Anti-aliasing:** Smooth, clean edges (no jagged lines)
- **Position:** Outside subject bounds (outline stroke)

### Implementation
- Use edge detection or alpha dilation
- Apply Gaussian blur (1–2px) before outline for smoothness
- Ensure outline is fully opaque (no transparency in stroke)

### Validation
```python
outline_width = calculate_outline_width(subject_height)
assert 12 <= outline_width <= 18
assert outline_color == (255, 255, 255, 255)  # White, fully opaque
assert outline_is_smooth == True
```

---

## 4. Shadow Requirements

### Style
- **Type:** Subtle inner shadow OR very soft outer shadow
- **Position:** Inside outline only (preferred) or 2–4px offset outer
- **Blur:** 4–8px Gaussian blur
- **Opacity:** 10–20% (subtle, not overpowering)
- **Color:** Black or dark gray (#000000 with 10–20% alpha)

### Purpose
- Adds depth and "sticker cutout" aesthetic
- Makes subject pop from transparent background
- Should be barely noticeable but improve visual quality

### Validation
```python
shadow_blur = 4-8px
shadow_opacity = 0.10-0.20
assert shadow_is_subtle == True
```

---

## 5. Text Requirements (if applicable)

### Size & Style
- **Font Size:** 80–120px (depends on template)
- **Max Lines:** 1–2 lines maximum
- **Stroke/Outline:** Required (4–8px white stroke)
- **Contrast:** High contrast (white text on dark subject, or dark text with white stroke)
- **Placement:** Top, center, or bottom (per template rules)
- **Readability:** Must be readable at small sizes (Telegram thumbnail)

### Templates
- **GM, GN, LFG:** Large, bold, top placement
- **HIGHER, HODL, WAGMI:** Medium, bold, center placement
- **NGMI, SER, REKT, ALPHA:** Large, bold, varies by template

### Validation
```python
assert font_size >= 80
assert line_count <= 2
assert has_stroke == True
assert stroke_width >= 4
assert is_readable_at_thumbnail_size == True
```

---

## 6. Video Constraints (Animated Stickers)

### Technical Requirements
- **Duration:** ≤ 3.0 seconds (strict)
- **Frame Rate:** ≤ 30 fps (24–30 fps recommended)
- **Format:** WEBM VP9 with alpha channel
- **Audio:** None (must be silent)
- **File Size:** ≤ 256 KB (strict)
- **Dimensions:** 512×512 pixels
- **Loop:** Must loop seamlessly (first frame ≈ last frame)

### Encoding Strategy
1. **First Pass:** Encode with quality settings (CRF 32, 30fps)
2. **If Size > 256KB:**
   - Reduce FPS: 30 → 24 → 20
   - Increase CRF: 32 → 36 → 40
   - Reduce bitrate cap if needed
3. **If Still Too Big:**
   - Simplify effects (fewer particles)
   - Reduce motion amplitude
   - Downscale to 480×480 (last resort)

### Validation
```python
assert duration <= 3.0
assert fps <= 30
assert format == "webm"
assert codec == "vp9"
assert has_alpha == True
assert audio_tracks == 0
assert file_size_kb <= 256
assert width == 512
assert height == 512
assert loops_seamlessly == True
```

---

## 7. Quality Gates (Auto-Validation)

### Image Stickers
1. ✅ Transparency exists after cutout
2. ✅ Subject bounding box occupies 50–90% of canvas
3. ✅ Outline is present and correct width
4. ✅ Shadow is subtle and present
5. ✅ Dimensions are exactly 512×512
6. ✅ File size is reasonable (PNG optimization)

### Video Stickers
1. ✅ Duration ≤ 3.0s
2. ✅ FPS ≤ 30
3. ✅ File size ≤ 256KB
4. ✅ Dimensions 512×512
5. ✅ No audio tracks
6. ✅ VP9 codec with alpha
7. ✅ Loops seamlessly

### Auto-Retry Logic
If validation fails:
- **Images:** Auto-adjust scale, outline thickness, retry postprocess
- **Videos:** Reduce bitrate/FPS, simplify effects, re-encode

**Acceptance Criteria:** User never receives "almost good" stickers. Only pass/fail.

---

## 8. Fail-Fast Strategy

### Priority Order
1. **Hard Constraints First:** Duration, FPS, file size, dimensions
2. **Visual Quality Second:** Outline, shadow, composition
3. **Polish Last:** Anti-aliasing, subtle effects

### Retry Limits
- **Max Retries:** 3 attempts per sticker
- **Timeout:** 30 seconds per attempt
- **Fallback:** If all retries fail, return error (don't send broken sticker)

---

## 9. Template-Specific Rules

### GM (Good Morning)
- Text: "GM" (uppercase, bold)
- Placement: Top center
- Animation: Gentle bounce, subtle sparkles
- Colors: Bright, energetic

### GN (Good Night)
- Text: "GN" (uppercase, bold)
- Placement: Top center
- Animation: Slow bounce, stars
- Colors: Calm, muted

### LFG (Let's F***ing Go)
- Text: "LFG" (uppercase, bold)
- Placement: Top center
- Animation: Strong bounce, shake, sparkles
- Colors: High energy, vibrant

### HIGHER
- Text: "HIGHER" (uppercase, bold)
- Placement: Center
- Animation: Upward motion, glow effect
- Colors: Bright, ascending gradient feel

### HODL
- Text: "HODL" (uppercase, bold)
- Placement: Center
- Animation: Steady, minimal motion
- Colors: Stable, confident

### WAGMI
- Text: "WAGMI" (uppercase, bold)
- Placement: Center
- Animation: Optimistic bounce, sparkles
- Colors: Positive, bright

### NGMI
- Text: "NGMI" (uppercase, bold)
- Placement: Center
- Animation: Downward motion, shake
- Colors: Muted, negative

### SER
- Text: "SER" (uppercase, bold)
- Placement: Center
- Animation: Quick pop, shake
- Colors: Alert, attention-grabbing

### REKT
- Text: "REKT" (uppercase, bold)
- Placement: Center
- Animation: Strong shake, impact effect
- Colors: Dramatic, high contrast

### ALPHA
- Text: "ALPHA" (uppercase, bold)
- Placement: Center
- Animation: Confident bounce, glow
- Colors: Premium, high-end

---

## 10. Acceptance Criteria

### For Every Sticker
- ✅ Passes all technical constraints (size, format, duration)
- ✅ Passes all visual quality checks (outline, shadow, composition)
- ✅ Looks like a professional Telegram sticker
- ✅ Works in Telegram (no errors when adding to pack)
- ✅ Maintains consistency within a pack (same style, same quality)

### For Every Pack
- ✅ All stickers in pack use same emoji
- ✅ All stickers maintain consistent style
- ✅ Pack creation succeeds without errors
- ✅ Pack link works and stickers display correctly

---

## 11. Implementation Notes

### Post-Processing Pipeline
1. **Input:** Base image (JPG/PNG, may have background)
2. **Background Removal:** Extract subject with alpha
3. **Edge Cleanup:** De-fringe, feather edges
4. **Normalization:** Auto-crop to subject, fit to 512×512
5. **Outline:** Add white stroke
6. **Shadow:** Add subtle shadow
7. **Validation:** Check all contract requirements
8. **Output:** Telegram-ready sticker

### Worker Functions
- `prepareStickerAsset(baseImage)` → asset.png
- `addOutlineAndShadow(asset)` → styled.png
- `validateStickerContract(sticker)` → pass/fail
- `autoRetryTuning(sticker, violations)` → fixed sticker

---

## 12. Version History

- **v1.0 (2025-01-18):** Initial contract definition

---

**This contract is non-negotiable. All sticker outputs MUST comply.**

