# AI Image-to-Video (i2v) Animation Architecture

## Overview

The new i2v pipeline generates true AI-animated stickers by:
1. **Subject Extraction**: Prepare character asset (background removal, outline, normalization)
2. **AI Video Generation**: Generate short animation using i2v model
3. **Background Removal**: Apply video matting to create transparent alpha
4. **Sticker Encoding**: Encode to WEBM VP9 with alpha, enforce Telegram compliance

## Architecture Flow

```
User Uploads Base Image
    ↓
/sticker/prepare-asset (Worker)
    ↓
prepared.png (512×512, transparent, outlined)
    ↓
Video Provider (Bot) → generateVideo()
    ↓
raw_video.mp4 (with background)
    ↓
/ai/animate (Worker) → matte_video() + encode
    ↓
final.webm (VP9, yuva420p, transparent)
    ↓
Quality Gates → Validate
    ↓
Return to Bot → Preview → Pack Creation
```

## Key Components

### 1. Video Provider System (`bot/src/ai/videoProviders/`)

**Interface**: `VideoProvider.generateVideo()`
- Input: Prepared asset, prompt, template, duration, FPS
- Output: Raw video file (MP4/WebM, usually with background)

**Providers**:
- `MemeputerVideoProvider`: Uses Memeputer AI agent for i2v
- Future: Can add other providers (Runway, Pika, etc.)

**Factory**: `generateVideo()` selects provider based on `VIDEO_PROVIDER` env var

### 2. Prompt Builder (`bot/src/services/promptBuilder.ts`)

Builds i2v prompts from templates:
- Template-specific actions (GM = wave, HODL = hold gesture, etc.)
- Enforces: single character, locked camera, no background
- Includes context and negative prompts

### 3. Video Matting (`worker/app/video_matte.py`)

Removes background from video frames:
- **Primary**: RVM (Robust Video Matting) - if available
- **Fallback**: Frame-by-frame segmentation using rembg
- **Last Resort**: Chroma key removal (green screen)

Output: Video with alpha channel

### 4. Animation Endpoint (`worker/app/animate.py` + `/ai/animate`)

**Endpoint**: `POST /ai/animate`

**Inputs**:
- `prepared_asset`: Prepared PNG (for reference matting)
- `raw_video`: Raw video from i2v provider
- `template_id`: Template ID
- `duration_sec`: Target duration
- `fps`: Target FPS

**Process**:
1. Apply video matting
2. Fit to 512×512, enforce duration/size limits
3. Encode to WEBM VP9 with alpha (`yuva420p`)
4. Run quality gates
5. Auto-retry if violations found

**Output**: Telegram-compliant sticker WEBM

### 5. Bot Flow Updates (`bot/src/telegram/flows_ai.ts`)

**New Flow**:
1. User uploads base image → Prepare asset
2. User provides context → Build prompt spec
3. User selects template → Generate video
4. **Try i2v first**:
   - Build prompt spec from template
   - Call `generateVideo()` (video provider)
   - Call `workerClient.aiAnimate()` (matting + encoding)
5. **Fallback to procedural** (if i2v fails):
   - Use existing blueprint renderer
   - Ensures flow never breaks

## Prompt Rules (Non-Negotiable)

All i2v prompts must enforce:
- ✅ "single character only"
- ✅ "no background / plain studio / solid chroma background"
- ✅ "locked camera"
- ✅ "keep identity / same face / same outfit"
- ✅ "simple readable action" (wave, nod, hold sign, point up, shrug)

**Text**: Don't ask video model to generate text. Add text in post-processing (clean fonts + stroke).

## Quality Gates

Video stickers must pass:
- ✅ Pixel format: `yuva420p` (alpha channel)
- ✅ Dimensions: 512×512
- ✅ Duration: ≤3.0s
- ✅ FPS: ≤30
- ✅ File size: ≤256KB
- ✅ No audio track
- ✅ Subject size: 70-90% of canvas height

## Fallback Strategy

If i2v generation fails:
1. Log error
2. Fall back to procedural blueprint renderer
3. User still gets a sticker (just not AI-animated)
4. Flow never breaks

## Environment Variables

```bash
VIDEO_PROVIDER=memeputer  # Select video provider
MEMEPUTER_API_BASE=https://developers.memeputer.com
MEMEPUTER_API_KEY=...
MEMEPUTER_AGENT_ID=...
```

## Testing Checklist

- [ ] i2v generation succeeds for all 5 templates (GM, GN, LFG, HODL, WAGMI)
- [ ] Generated video has transparent background (check with ffprobe)
- [ ] Video passes quality gates (size, duration, alpha)
- [ ] Fallback works if i2v fails
- [ ] Preview shows before pack creation
- [ ] Sticker displays correctly in Telegram

## Future Enhancements

1. **RVM Integration**: Full RVM implementation for better matting
2. **Multiple Providers**: Add Runway, Pika, etc.
3. **Text Overlay**: Add text in post-processing (not in video generation)
4. **Loop Optimization**: Ensure seamless loops
5. **Temporal Smoothing**: Better alpha consistency across frames

