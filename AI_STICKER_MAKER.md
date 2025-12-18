# AI Sticker Maker - How It Works

## Overview
The AI Sticker Maker creates animated Telegram stickers from a base image using AI-generated blueprints. It combines your project's visual identity with predefined templates to create unique animated stickers.

## User Flow

### Step 1: Start AI Sticker Maker
- User clicks **"✨ AI Sticker Maker"** button or types `/ai`
- Bot asks: *"Send a base image (PNG preferred, JPG also accepted)."*

### Step 2: Upload Base Image
- User sends an image (PNG or JPG)
- Bot downloads and stores the image
- Bot asks: *"What is this project/coin/mascot about? (vibe, inside jokes, do's/don'ts, colors, keywords)\n\nOr send /skip to skip."*

### Step 3: Project Context (Optional)
- User can provide context about their project/coin/mascot
  - Examples: "A crypto project about dogs", "DeFi protocol with blue theme", "NFT collection with space theme"
- Or user can type `/skip` to skip this step
- Bot asks: *"Choose a template. Reply with one of: GM, GN, LFG, HIGHER, HODL, WAGMI, NGMI, SER, REKT, ALPHA"*

### Step 4: Choose Template
User selects one of these templates:
- **GM** - "Good Morning" with bounce, blink, and sparkles
- **GN** - "Good Night" with slow bounce and stars
- **LFG** - "Let's F***ing Go" with strong bounce
- **HIGHER** - Upward motion template
- **HODL** - "Hold On for Dear Life" with bounce
- **WAGMI** - "We're All Gonna Make It" template
- **NGMI** - "Not Gonna Make It" template
- **SER** - Template variant
- **REKT** - "Wrecked" template
- **ALPHA** - Alpha template

### Step 5: AI Generation
- Bot sends: *"🎨 Generating sticker with AI..."`
- Bot calls **Memeputer AI Agent** with:
  - Template ID (e.g., "GM")
  - Project context (if provided)
  - Constraints (≤3s, ≤30fps, ≤256KB, etc.)
- Memeputer returns a **Blueprint JSON** describing:
  - Animation duration, FPS, loop settings
  - Text content and placement
  - Motion effects (bounce, shake, etc.)
  - Face effects (blink)
  - Visual effects (sparkles, stars)

### Step 6: Render Sticker
- Bot sends blueprint to **Worker Service**
- Worker procedurally renders animated sticker:
  - Loads base image
  - Applies motion effects (bounce, shake)
  - Adds text with stroke
  - Applies face effects (blink)
  - Adds visual effects (sparkles, stars)
  - Generates frames
  - Encodes to WEBM VP9 (Telegram-compliant)
- Bot receives the rendered sticker file

### Step 7: Pack Creation
- Bot sends: *"✅ Sticker generated! Reply with:\n• "new" to create a new pack\n• "existing <pack_name>" to add to existing pack"*
- User chooses to create new pack or add to existing
- If new: Bot asks for pack title, then emoji
- If existing: Bot auto-fetches emoji from pack
- Bot creates/adds sticker to pack
- Bot sends pack link: `https://t.me/addstickers/<pack_name>`

## Technical Details

### Memeputer AI Agent
- **Endpoint**: `POST /generate`
- **Request**:
  ```json
  {
    "template_id": "GM",
    "project_context": "A crypto project about dogs",
    "constraints": {
      "duration_max_sec": 3.0,
      "fps_max": 30,
      "transparent_background": true,
      "big_readable_text": true,
      "loop_friendly": true,
      "target_size_kb": 256
    }
  }
  ```
- **Response**: Blueprint JSON
- **Fallback**: If Memeputer is unavailable, uses default blueprints

### Worker Service
- **Endpoint**: `POST /ai/render`
- **Input**: Base image file + Blueprint JSON
- **Process**:
  1. Load base image with alpha channel
  2. For each frame (based on duration and FPS):
     - Apply motion effects (bounce/shake transforms)
     - Render text with stroke
     - Apply face effects (blink overlay)
     - Add visual effects (sparkles/stars)
  3. Save frames as images
  4. Encode frames to WEBM VP9
  5. Ensure compliance (≤3s, ≤30fps, ≤256KB, 512px max)
- **Output**: WEBM file path + metadata

### Blueprint Structure
```typescript
{
  duration_sec: 2.6,
  fps: 20,
  loop: true,
  text: {
    value: "GM",
    subvalue: "$JOBS",
    placement: "top",
    stroke: true
  },
  motion: {
    type: "bounce",
    amplitude_px: 10,
    period_sec: 1.3
  },
  face: {
    blink: true,
    blink_every_sec: 2.0
  },
  effects: {
    sparkles: true,
    sparkle_count: 6
  }
}
```

## Error Handling
- If Memeputer fails: Falls back to default blueprint for template
- If rendering fails: Bot sends error message
- If pack creation fails: Bot sends error with details

## Future Enhancements
- Custom text input (not just templates)
- More template options
- Custom motion effects
- Multiple sticker generation from one image
- Preview before pack creation

