"""
AI Video Animation Pipeline
Generates video from prepared asset using i2v, then applies matting and encoding.
"""
import os
import secrets
import time
import logging
import json
import subprocess
from typing import Dict, Any, Optional
from PIL import Image
from .sticker_asset import prepareStickerAsset
from .video_matte import matte_video
from .sizefit import fit_to_limits
from .quality_gates import validate_video_sticker
from .ffmpeg_utils import probe_media, get_file_size_kb

logger = logging.getLogger(__name__)

# For now, we'll call the video provider from the bot side
# Worker will handle matting and encoding
# In future, worker could call video provider directly if needed


def animate_from_asset(
    prepared_asset_path: str,
    raw_video_path: str,
    template_id: str,
    output_path: str,
    duration_sec: float = 2.6,
    fps: int = 24
) -> Dict[str, Any]:
    """
    Process raw video (from i2v) into Telegram-compliant sticker.
    
    Steps:
    1. Apply video matting (remove background, add alpha)
    2. Ensure 512x512 dimensions
    3. Encode to WEBM VP9 with alpha
    4. Apply quality gates
    5. Auto-retry if needed
    
    Args:
        prepared_asset_path: Path to prepared asset (for reference matting)
        raw_video_path: Path to raw video from i2v provider
        template_id: Template ID (for logging)
        output_path: Output path for final sticker
        duration_sec: Target duration
        fps: Target FPS
    
    Returns:
        Metadata dict with duration, kb, width, height, fps, pix_fmt
    """
    logger.info(f"Animating from asset: {prepared_asset_path}, raw video: {raw_video_path}")
    
    temp_dir = '/tmp/packputer'
    os.makedirs(temp_dir, exist_ok=True)
    
    timestamp = int(time.time() * 1000)
    unique_id = secrets.token_hex(8)
    
    # Step 1: Apply video matting (remove background, add alpha)
    matted_video = os.path.join(temp_dir, f'matted_{timestamp}_{unique_id}.webm')
    logger.info("Applying video matting...")
    
    matting_success = matte_video(
        raw_video_path,
        matted_video,
        reference_image_path=prepared_asset_path
    )
    
    if not matting_success:
        logger.warning("Video matting failed, using raw video with chroma key fallback")
        # Fallback: try chroma key removal
        matted_video = apply_chroma_key(raw_video_path, temp_dir, timestamp, unique_id)
        if not matted_video:
            raise ValueError("Failed to apply background removal to video")
    
    # Step 2: Fit to limits (512x512, duration, size)
    logger.info("Fitting video to Telegram limits...")
    final_path, metadata = fit_to_limits(matted_video, duration_sec, 'transparent')
    
    # Step 3: Quality gates
    logger.info("Validating video sticker...")
    is_valid, violations = validate_video_sticker(final_path, metadata)
    
    if not is_valid:
        logger.warning(f"Quality gate violations: {[str(v) for v in violations]}")
        # Auto-retry logic would go here (reduce FPS, duration, etc.)
        # For now, log and continue
    
    # Step 4: Move to final output path
    if final_path != output_path:
        if os.path.exists(output_path):
            os.unlink(output_path)
        os.rename(final_path, output_path)
        final_path = output_path
    
    # Add pixel format to metadata
    try:
        _, _, _, _, pix_fmt = probe_media(output_path)
        metadata['pix_fmt'] = pix_fmt
    except Exception as e:
        logger.warning(f"Could not probe pixel format: {e}")
        metadata['pix_fmt'] = 'yuva420p'  # Assume correct format
    
    metadata['validated'] = is_valid
    if violations:
        metadata['violations'] = [str(v) for v in violations]
    
    logger.info(f"✅ Animation complete: {output_path}, metadata: {metadata}")
    return metadata


def apply_chroma_key(
    input_video: str,
    temp_dir: str,
    timestamp: int,
    unique_id: str
) -> Optional[str]:
    """
    Fallback: Apply chroma key removal (green/blue screen).
    """
    try:
        output_path = os.path.join(temp_dir, f'chroma_{timestamp}_{unique_id}.webm')
        
        # Use ffmpeg chroma key filter
        cmd = [
            'ffmpeg',
            '-i', input_video,
            '-vf', 'chromakey=0x00ff00:0.3:0.2',  # Remove green background
            '-c:v', 'libvpx-vp9',
            '-pix_fmt', 'yuva420p',
            '-auto-alt-ref', '0',
            '-an',
            '-y',
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        return output_path
    except Exception as e:
        logger.error(f"Chroma key failed: {e}")
        return None

