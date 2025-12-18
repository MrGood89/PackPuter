"""
Sticker Asset Preparation Pipeline
Implements the Sticker Style Contract for consistent, high-quality sticker outputs.
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
from typing import Tuple, Optional
import logging

# Check if scipy is available
try:
    import scipy.ndimage
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

logger = logging.getLogger(__name__)

# Sticker Style Contract constants
CANVAS_SIZE = 512
SUBJECT_HEIGHT_MIN = 0.70  # 70% of canvas
SUBJECT_HEIGHT_MAX = 0.90  # 90% of canvas
OUTLINE_WIDTH_MIN = 12
OUTLINE_WIDTH_MAX = 18
SHADOW_BLUR = 6
SHADOW_OPACITY = 0.15
SHADOW_OFFSET = 3


def prepareStickerAsset(
    base_image_path: str,
    output_path: Optional[str] = None,
    remove_background: bool = True
) -> str:
    """
    Prepare a base image into a Telegram-ready sticker asset.
    
    Steps:
    1. Load and convert to RGBA
    2. Remove background (if needed)
    3. Edge cleanup (de-fringe, feather)
    4. Normalize subject placement (auto-crop, center, fit to 512x512)
    5. Add white outline
    6. Add subtle shadow
    
    Args:
        base_image_path: Path to input image (JPG/PNG, may have background)
        output_path: Optional output path (auto-generated if None)
        remove_background: Whether to attempt background removal
        
    Returns:
        Path to prepared asset.png
    """
    if output_path is None:
        base_name = os.path.splitext(os.path.basename(base_image_path))[0]
        output_dir = os.path.dirname(base_image_path)
        output_path = os.path.join(output_dir, f"{base_name}_asset.png")
    
    logger.info(f"Preparing sticker asset from: {base_image_path}")
    
    # Step 1: Load image
    img = Image.open(base_image_path).convert("RGBA")
    original_size = img.size
    logger.info(f"Original image size: {original_size}")
    
    # Step 2: Remove background (if needed)
    if remove_background:
        img = remove_background_simple(img)
    
    # Step 3: Edge cleanup
    img = cleanup_edges(img)
    
    # Step 4: Normalize subject placement
    img = normalize_subject_placement(img)
    
    # Step 5: Add outline
    img = add_outline(img)
    
    # Step 6: Add shadow
    img = add_shadow(img)
    
    # Step 7: Final validation
    validate_sticker_asset(img)
    
    # Save
    img.save(output_path, "PNG", optimize=True)
    logger.info(f"Sticker asset saved to: {output_path}")
    
    return output_path


def remove_background_simple(img: Image.Image) -> Image.Image:
    """
    Simple background removal using alpha channel manipulation.
    For production, consider using rembg or SAM-based segmentation.
    """
    # Convert to numpy array
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # If image already has transparency, use it
    if np.any(alpha < 255):
        logger.info("Image already has transparency, using existing alpha")
        return img
    
    # Simple approach: assume edges are background
    # For better results, use rembg or similar
    logger.warning("Simple background removal - consider using rembg for better results")
    
    # For now, return image as-is (assume user uploaded transparent PNG)
    # In production, integrate rembg here:
    # from rembg import remove
    # img = remove(img)
    
    return img


def cleanup_edges(img: Image.Image, feather_pixels: int = 2) -> Image.Image:
    """
    Clean up edges: de-fringe and feather for smooth edges.
    """
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # Feather edges: apply slight blur to alpha channel
    alpha_img = Image.fromarray(alpha, mode='L')
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=feather_pixels))
    
    # Recombine
    arr[:, :, 3] = np.array(alpha_img)
    img = Image.fromarray(arr, mode='RGBA')
    
    return img


def normalize_subject_placement(img: Image.Image) -> Image.Image:
    """
    Auto-crop to subject bounds, then fit to 512x512 canvas with proper scaling.
    Ensures subject is 70-90% of canvas height and centered.
    """
    # Get subject bounding box (non-transparent area)
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # Find bounding box
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        logger.warning("No subject found, using full image")
        top, bottom = 0, img.height
        left, right = 0, img.width
    else:
        top, bottom = np.where(rows)[0][[0, -1]]
        left, right = np.where(cols)[0][[0, -1]]
    
    # Crop to subject
    subject_box = (left, top, right + 1, bottom + 1)
    img = img.crop(subject_box)
    subject_size = img.size
    logger.info(f"Subject bounding box: {subject_box}, size: {subject_size}")
    
    # Calculate target size (70-90% of canvas height)
    target_height = int(CANVAS_SIZE * 0.80)  # Use 80% as default
    aspect_ratio = subject_size[0] / subject_size[1]
    target_width = int(target_height * aspect_ratio)
    
    # Ensure it fits within canvas
    if target_width > CANVAS_SIZE:
        target_width = CANVAS_SIZE
        target_height = int(target_width / aspect_ratio)
    
    # Resize subject
    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    # Create 512x512 transparent canvas
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    
    # Center subject on canvas
    x_offset = (CANVAS_SIZE - target_width) // 2
    y_offset = (CANVAS_SIZE - target_height) // 2
    canvas.paste(img, (x_offset, y_offset), img)
    
    logger.info(f"Subject normalized: {subject_size} -> {target_width}x{target_height}, centered on 512x512")
    
    return canvas


def add_outline(img: Image.Image) -> Image.Image:
    """
    Add white outline around subject.
    Outline width scales with subject size (12-18px).
    """
    # Calculate subject height to determine outline width
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    
    if np.any(rows):
        subject_height = np.sum(rows)
        # Scale outline: 70% height = 12px, 90% height = 18px
        height_ratio = subject_height / CANVAS_SIZE
        outline_width = int(OUTLINE_WIDTH_MIN + (height_ratio - SUBJECT_HEIGHT_MIN) * 
                          (OUTLINE_WIDTH_MAX - OUTLINE_WIDTH_MIN) / 
                          (SUBJECT_HEIGHT_MAX - SUBJECT_HEIGHT_MIN))
        outline_width = max(OUTLINE_WIDTH_MIN, min(OUTLINE_WIDTH_MAX, outline_width))
    else:
        outline_width = 15  # Default
    
    logger.info(f"Adding white outline: {outline_width}px")
    
    # Get alpha channel
    alpha_channel = img.split()[3]
    alpha_array = np.array(alpha_channel)
    
    # Create binary mask (non-transparent = True)
    mask = alpha_array > 128
    
    if HAS_SCIPY:
        # Use scipy for accurate dilation
        from scipy.ndimage import binary_dilation
        # Create structuring element (circular)
        structure = np.ones((outline_width * 2 + 1, outline_width * 2 + 1))
        # Dilate mask
        dilated_mask = binary_dilation(mask, structure=structure, iterations=1)
        # Get outline (dilated - original)
        outline_mask = dilated_mask & ~mask
    else:
        # Fallback: use PIL filter for dilation
        # Expand alpha channel
        alpha_expanded = alpha_channel.filter(ImageFilter.MaxFilter(size=outline_width * 2 + 1))
        alpha_expanded_arr = np.array(alpha_expanded)
        # Create outline mask (expanded - original)
        outline_mask = (alpha_expanded_arr > 128) & (alpha_array <= 128)
    
    # Create white outline layer
    outline_arr = np.zeros_like(arr)
    outline_arr[outline_mask, 0] = 255  # R
    outline_arr[outline_mask, 1] = 255  # G
    outline_arr[outline_mask, 2] = 255  # B
    outline_arr[outline_mask, 3] = 255  # A (fully opaque)
    
    outline_img = Image.fromarray(outline_arr, mode='RGBA')
    
    # Composite: outline behind, original on top
    result = Image.alpha_composite(outline_img, img)
    
    return result


def add_shadow(img: Image.Image) -> Image.Image:
    """
    Add subtle inner shadow for depth.
    """
    logger.info("Adding subtle shadow")
    
    # Create shadow layer
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    
    # Get alpha channel
    alpha = img.split()[3]
    
    # Create shadow mask (slightly offset and blurred)
    shadow_mask = alpha.copy()
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(radius=SHADOW_BLUR))
    
    # Apply opacity
    shadow_arr = np.array(shadow_mask)
    shadow_arr = (shadow_arr * SHADOW_OPACITY).astype(np.uint8)
    shadow_mask = Image.fromarray(shadow_arr, mode='L')
    
    # Create shadow image (black with opacity)
    shadow_arr = np.array(shadow)
    shadow_arr[:, :, 3] = np.array(shadow_mask)
    shadow = Image.fromarray(shadow_arr, mode='RGBA')
    
    # Composite shadow behind original (inner shadow effect)
    result = Image.alpha_composite(shadow, img)
    
    return result


def validate_sticker_asset(img: Image.Image) -> bool:
    """
    Validate that asset meets Sticker Style Contract requirements.
    Raises ValueError if validation fails.
    """
    # Check dimensions
    if img.size != (CANVAS_SIZE, CANVAS_SIZE):
        raise ValueError(f"Canvas size must be {CANVAS_SIZE}x{CANVAS_SIZE}, got {img.size}")
    
    # Check has alpha
    if img.mode != "RGBA":
        raise ValueError(f"Image must be RGBA, got {img.mode}")
    
    # Check subject size (70-90% of canvas)
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    
    if np.any(rows):
        subject_height = np.sum(rows)
        height_ratio = subject_height / CANVAS_SIZE
        
        # Use >= and <= with small epsilon to handle floating point precision
        if not (SUBJECT_HEIGHT_MIN <= height_ratio <= SUBJECT_HEIGHT_MAX + 0.001):
            raise ValueError(f"Subject height must be {SUBJECT_HEIGHT_MIN*100}%-{SUBJECT_HEIGHT_MAX*100}% of canvas, got {height_ratio*100:.1f}%")
    
    # Check centered (rough check)
    cols = np.any(alpha > 0, axis=0)
    if np.any(cols):
        left = np.where(cols)[0][0]
        right = np.where(cols)[0][-1]
        center_x = (left + right) / 2
        canvas_center = CANVAS_SIZE / 2
        offset = abs(center_x - canvas_center)
        
        if offset > CANVAS_SIZE * 0.1:  # 10% tolerance
            logger.warning(f"Subject may not be centered: offset {offset}px")
    
    logger.info("Sticker asset validation passed")
    return True

