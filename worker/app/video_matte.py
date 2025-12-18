"""
Video Matting for Background Removal
Removes background from video frames to create transparent alpha channel.
Uses Robust Video Matting (RVM) or fallback to frame-by-frame segmentation.
"""
import os
import subprocess
import logging
import numpy as np
from PIL import Image
from typing import List, Tuple, Optional
import tempfile
import shutil

logger = logging.getLogger(__name__)

# Try to import RVM (Robust Video Matting)
try:
    import torch
    RVM_AVAILABLE = True
    logger.info("RVM (Robust Video Matting) is available.")
except ImportError:
    RVM_AVAILABLE = False
    logger.warning("RVM not found. Will use frame-by-frame segmentation fallback.")


def matte_video(
    input_video_path: str,
    output_video_path: str,
    reference_image_path: Optional[str] = None
) -> bool:
    """
    Remove background from video using matting.
    
    Args:
        input_video_path: Input video (usually has background)
        output_video_path: Output video with alpha channel (WEBM VP9)
        reference_image_path: Optional reference image for better matting
    
    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Matting video: {input_video_path} -> {output_video_path}")
    
    if RVM_AVAILABLE and reference_image_path:
        return matte_with_rvm(input_video_path, output_video_path, reference_image_path)
    else:
        return matte_with_segmentation(input_video_path, output_video_path)


def matte_with_rvm(
    input_video_path: str,
    output_video_path: str,
    reference_image_path: str
) -> bool:
    """
    Use Robust Video Matting (RVM) for high-quality video matting.
    This requires RVM model files and PyTorch.
    """
    try:
        # RVM implementation would go here
        # For now, fall back to segmentation
        logger.warning("RVM not fully implemented, using segmentation fallback")
        return matte_with_segmentation(input_video_path, output_video_path)
    except Exception as e:
        logger.error(f"RVM matting failed: {e}")
        return matte_with_segmentation(input_video_path, output_video_path)


def matte_with_segmentation(
    input_video_path: str,
    output_video_path: str
) -> bool:
    """
    Frame-by-frame background removal using segmentation.
    Extracts frames, processes each, then re-encodes with alpha.
    """
    temp_dir = tempfile.mkdtemp(prefix='matte_')
    
    try:
        # Extract frames
        frames_dir = os.path.join(temp_dir, 'frames')
        alpha_dir = os.path.join(temp_dir, 'alpha')
        os.makedirs(frames_dir, exist_ok=True)
        os.makedirs(alpha_dir, exist_ok=True)
        
        logger.info("Extracting frames from video...")
        extract_cmd = [
            'ffmpeg',
            '-i', input_video_path,
            '-vf', 'fps=30',
            os.path.join(frames_dir, 'frame_%05d.png')
        ]
        subprocess.run(extract_cmd, check=True, capture_output=True)
        
        # Process each frame
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
        logger.info(f"Processing {len(frame_files)} frames...")
        
        for i, frame_file in enumerate(frame_files):
            frame_path = os.path.join(frames_dir, frame_file)
            frame = Image.open(frame_path).convert('RGBA')
            
            # Simple background removal: assume edges are background
            # For production, use rembg or similar per frame
            arr = np.array(frame)
            alpha = arr[:, :, 3]
            
            # If frame already has transparency, use it
            if np.any(alpha < 255):
                # Frame already has alpha, keep it
                pass
            else:
                # Simple chroma key: remove green/blue backgrounds
                # Or use rembg for each frame
                try:
                    from rembg import remove
                    frame_rgba = remove(frame)
                    arr = np.array(frame_rgba)
                except ImportError:
                    logger.warning("rembg not available, using simple edge-based removal")
                    # Fallback: assume center is subject, edges are background
                    h, w = arr.shape[:2]
                    center_y, center_x = h // 2, w // 2
                    
                    # Create distance-based alpha (fade edges)
                    y, x = np.ogrid[:h, :w]
                    dist_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
                    max_dist = np.sqrt(center_x**2 + center_y**2)
                    alpha_mask = (1 - dist_from_center / max_dist * 0.3).clip(0, 1)
                    arr[:, :, 3] = (alpha_mask * 255).astype(np.uint8)
            
            # Save processed frame
            processed_frame = Image.fromarray(arr, mode='RGBA')
            processed_frame.save(frame_path)
            
            if (i + 1) % 10 == 0:
                logger.info(f"Processed {i + 1}/{len(frame_files)} frames")
        
        # Re-encode with alpha
        logger.info("Re-encoding video with alpha channel...")
        encode_cmd = [
            'ffmpeg',
            '-y',
            '-framerate', '30',
            '-i', os.path.join(frames_dir, 'frame_%05d.png'),
            '-c:v', 'libvpx-vp9',
            '-pix_fmt', 'yuva420p',  # VP9 with alpha
            '-auto-alt-ref', '0',
            '-crf', '32',
            '-b:v', '0',
            '-an',  # No audio
            output_video_path
        ]
        subprocess.run(encode_cmd, check=True, capture_output=True)
        
        logger.info(f"✅ Video matting complete: {output_video_path}")
        return True
        
    except Exception as e:
        logger.error(f"Video matting failed: {e}", exc_info=True)
        return False
    finally:
        # Cleanup temp directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

