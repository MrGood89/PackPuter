# Sticker Template Rules

**Purpose:** Define how to handle each template when generating image stickers.

**Usage:** When `template_id` is provided in the request, use these rules to generate the appropriate prompt and text styling.

---

## Template: GM (Good Morning)

- **Text:** "GM" (uppercase, bold)
- **Placement:** Top center
- **Font Size:** 120px
- **Stroke Width:** 8px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character saying GM (Good Morning) with enthusiasm
  - Celebrating, energetic, positive morning vibe
  - Gentle bounce motion feel (even for static image)
  - Subtle sparkles/energy around character
- **Colors:** Bright, energetic, gold/yellow accents

**Example Prompt Addition:**
"The character is saying GM (Good Morning) with enthusiasm and energy. Morning celebration, positive vibe, energetic pose, subtle sparkles or energy effects around the character."

---

## Template: GN (Good Night)

- **Text:** "GN" (uppercase, bold)
- **Placement:** Top center
- **Font Size:** 120px
- **Stroke Width:** 8px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character saying GN (Good Night) calmly
  - Calm, peaceful, sleepy vibe
  - Slow, gentle motion feel
  - Stars or moon imagery
- **Colors:** Calm, muted, blue/night colors

**Example Prompt Addition:**
"The character is saying GN (Good Night) calmly and peacefully. Nighttime vibe, calm pose, sleepy or relaxed expression, stars or moon imagery."

---

## Template: LFG (Let's F***ing Go)

- **Text:** "LFG" (uppercase, bold)
- **Placement:** Top center
- **Font Size:** 110px
- **Stroke Width:** 8px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character saying LFG with extreme enthusiasm
  - High energy, excitement, celebration
  - Strong bounce/shake motion feel
  - Sparkles, energy bursts, excitement effects
- **Colors:** High energy, vibrant, red/orange

**Example Prompt Addition:**
"The character is saying LFG (Let's F***ing Go) with extreme enthusiasm and excitement. High energy celebration, excited pose, energy bursts and sparkles around the character, dynamic motion."

---

## Template: HIGHER

- **Text:** "HIGHER" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 100px
- **Stroke Width:** 6px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character reaching upward, ascending
  - Upward motion, growth, progress
  - Glow effect, ascending energy
- **Colors:** Bright, ascending gradient feel, purple/violet

**Example Prompt Addition:**
"The character is reaching upward, ascending, showing growth and progress. Upward motion pose, glow effect, ascending energy, HIGHER text prominently displayed."

---

## Template: HODL

- **Text:** "HODL" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 110px
- **Stroke Width:** 6px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character holding strong, confident
  - Steady, stable, confident pose
  - Minimal motion, solid stance
- **Colors:** Stable, confident, green

**Example Prompt Addition:**
"The character is holding strong and confidently. Steady, stable pose, confident expression, solid stance, HODL text prominently displayed."

---

## Template: WAGMI (We're All Gonna Make It)

- **Text:** "WAGMI" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 100px
- **Stroke Width:** 6px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character optimistic, positive, encouraging
  - Optimistic bounce motion feel
  - Sparkles, positive energy
- **Colors:** Positive, bright, orange/gold

**Example Prompt Addition:**
"The character is optimistic and encouraging, showing positive energy. Optimistic pose, positive expression, sparkles and positive energy effects, WAGMI text prominently displayed."

---

## Template: NGMI (Not Gonna Make It)

- **Text:** "NGMI" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 110px
- **Stroke Width:** 6px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character disappointed, sad, defeated
  - Downward motion, disappointment
  - Shake effect, negative energy
- **Colors:** Muted, negative, dark red

**Example Prompt Addition:**
"The character is disappointed and defeated, showing negative energy. Downward motion pose, sad or disappointed expression, shake effect, NGMI text prominently displayed."

---

## Template: SER (Serious)

- **Text:** "SER" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 110px
- **Stroke Width:** 8px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character serious, focused, determined
  - Quick pop motion feel
  - Shake effect, alert energy
- **Colors:** Alert, attention-grabbing, orange

**Example Prompt Addition:**
"The character is serious and focused, showing determination. Serious pose, focused expression, alert energy, SER text prominently displayed."

---

## Template: REKT

- **Text:** "REKT" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 110px
- **Stroke Width:** 8px
- **Text Color:** #FFFFFF (white)
- **Prompt Elements:**
  - Character defeated, destroyed, wrecked
  - Strong shake, impact effect
  - Dramatic, high contrast
- **Colors:** Dramatic, high contrast, dark red

**Example Prompt Addition:**
"The character is defeated and wrecked, showing destruction. Defeated pose, dramatic expression, strong shake and impact effects, REKT text prominently displayed."

---

## Template: ALPHA

- **Text:** "ALPHA" (uppercase, bold)
- **Placement:** Center
- **Font Size:** 100px
- **Stroke Width:** 6px
- **Text Color:** #000000 (black, with white stroke)
- **Prompt Elements:**
  - Character confident, dominant, alpha
  - Confident bounce, glow effect
  - Premium, high-end feel
- **Colors:** Premium, high-end, gold

**Example Prompt Addition:**
"The character is confident and dominant, showing alpha energy. Confident pose, dominant expression, glow effect, premium feel, ALPHA text prominently displayed."

---

## General Template Rules

1. **Text is Always Required:** If a template has text (GM, GN, LFG, etc.), include it in the `text.value` field
2. **Text Placement:** Follow template-specific placement (top, center, bottom)
3. **Font Size:** Use template-specific font size (80-120px range)
4. **Stroke Width:** Use template-specific stroke width (4-8px)
5. **Prompt Integration:** Always incorporate template-specific mood, energy, and visual elements into the main prompt
6. **Character Consistency:** Maintain the same character identity from the base image across all templates

---

## Custom Mode (No Template)

When `mode: "custom"` and no `template_id` is provided:
- Use `user_prompt` to determine the action/pose
- Text is optional (only include if `user_prompt` explicitly mentions text)
- Generate prompt based on custom instructions while maintaining character consistency

---

**These template rules ensure consistent, high-quality sticker generation across all templates.**

