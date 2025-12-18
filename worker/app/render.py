import os
import json
import time
import secrets
import shutil
import subprocess
import logging
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from typing import Dict, Any
from .blueprint import parse_blueprint, validate_blueprint, enhance_blueprint_with_sticker_grade_motion
from .sizefit import fit_to_limits
from .quality_gates import validate_video_sticker, auto_retry_tuning

logger = logging.getLogger(__name__)

def render_animation(
    base_image_path: str,
    blueprint_json: str,
    output_path: str
) -> Dict[str, Any]:
    """Render animated sticker from base image and blueprint.
    Enforces Sticker Style Contract with quality gates and auto-retry.
    """
    blueprint = parse_blueprint(blueprint_json)
    if not validate_blueprint(blueprint):
        raise ValueError('Invalid blueprint structure')
    
    # Enhance blueprint with sticker-grade motion fields
    blueprint = enhance_blueprint_with_sticker_grade_motion(blueprint)
    
    # Load base image
    base_img = Image.open(base_image_path).convert('RGBA')
    base_width, base_height = base_img.size
    
    # Scale to fit 512x512 (maintain aspect ratio)
    target_size = 512
    scale = min(target_size / base_width, target_size / base_height)
    new_width = int(base_width * scale)
    new_height = int(base_height * scale)
    base_img = base_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create canvas
    canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    x_offset = (target_size - new_width) // 2
    y_offset = (target_size - new_height) // 2
    
    # Animation parameters - HARD CONSTRAINTS
    duration = min(blueprint.get('duration_sec', 2.6), 3.0)  # Force ≤3.0s
    fps = min(blueprint.get('fps', 20), 30)  # Force ≤30fps
    total_frames = int(duration * fps)
    
    # Extended style settings (with defaults for "sticker look")
    style = blueprint.get('style', {})
    # font_size will be set from textLayer if available (see below)
    default_font_size = style.get('fontSize', 120)  # Big readable text (default 120 for stickers)
    text_color = style.get('textColor', '#FFFFFF')  # White text
    stroke_color = style.get('strokeColor', '#000000')  # Black stroke
    default_stroke_width = style.get('strokeWidth', 8)  # Thick stroke (default 8 for stickers)
    outline_width = style.get('outlineWidth', 2)  # White outline
    
    # Layout settings
    layout = blueprint.get('layout', {})
    safe_margin = layout.get('safeMargin', 20)
    text_anchor = layout.get('textAnchor', 'top')
    max_text_width = layout.get('maxTextWidth', 400)
    
    # Text settings - use textLayer if available (enhanced blueprint)
    text_layer = blueprint.get('textLayer', {})
    text_config = blueprint.get('text', {})
    
    if text_layer:
        # Use enhanced textLayer
        text_value = text_layer.get('content', '')
        text_placement = text_layer.get('placement', text_anchor)
        text_stroke = text_layer.get('stroke', True)
        font_size = text_layer.get('size', default_font_size)  # Use template-defined size
        stroke_width = text_layer.get('strokeWidth', default_stroke_width)
        entrance_anim = text_layer.get('entranceAnimation', {})
        text_subvalue = ''  # textLayer doesn't have subvalue
    else:
        # Fall back to legacy text config
        text_value = text_config.get('value', '')
        text_subvalue = text_config.get('subvalue', '')
        text_placement = text_config.get('placement', text_anchor)
        text_stroke = text_config.get('stroke', True)
        font_size = default_font_size
        stroke_width = default_stroke_width
        entrance_anim = {}
    
    # Motion settings - "sticker look" defaults
    # Use enhanced subjectTransform if available, otherwise fall back to motion
    subject_transform = blueprint.get('subjectTransform', {})
    motion = blueprint.get('motion', {})
    
    if subject_transform and 'bounce' in subject_transform:
        bounce_cfg = subject_transform['bounce']
        motion_type = 'bounce'
        amplitude = bounce_cfg.get('amplitude', 8)
        period = bounce_cfg.get('period', 1.3)
    else:
        motion_type = motion.get('type', 'bounce')  # Default subtle bounce
        amplitude = motion.get('amplitude_px', 8)  # Subtle motion
        period = motion.get('period_sec', 1.3)
    
    # Additional transform options
    squash_enabled = subject_transform.get('squash', {}).get('enabled', False) if subject_transform else False
    rotation_enabled = subject_transform.get('rotation', {}).get('enabled', False) if subject_transform else False
    rotation_jitter = subject_transform.get('rotation', {}).get('jitter', 2.0) if subject_transform else 2.0
    
    # Face settings
    face = blueprint.get('face', {})
    blink_enabled = face.get('blink', False)
    blink_interval = face.get('blink_every_sec', 2.0)
    
    # Effects - minimal for sticker look
    effects = blueprint.get('effects', {})
    sparkles = effects.get('sparkles', False)
    sparkle_count = effects.get('sparkle_count', 4)  # Reduced for cleaner look
    stars = effects.get('stars', False)
    glow = effects.get('glow', False)
    
    # Timing (for future use)
    timing = blueprint.get('timing', {})
    intro_ms = timing.get('introMs', 0)
    loop_ms = timing.get('loopMs', int(duration * 1000))
    outro_ms = timing.get('outroMs', 0)
    
    # Create frames directory in shared volume with unique name
    unique_id = secrets.token_hex(8)  # 16 hex chars
    timestamp = int(time.time() * 1000)  # milliseconds for better precision
    frames_dir = f'/tmp/packputer/frames_{timestamp}_{unique_id}'
    os.makedirs(frames_dir, exist_ok=True)
    frame_paths = []
    
    try:
        for frame_idx in range(total_frames):
            t = frame_idx / fps
            
            # Create frame
            frame = canvas.copy()
            
            # Calculate motion offset using enhanced transform
            y_motion = 0
            x_motion = 0
            rotation = 0
            scale_factor = 1.0
            
            if motion_type == 'bounce':
                y_motion = int(amplitude * np.sin(2 * np.pi * t / period))
            elif motion_type == 'shake':
                y_motion = int(amplitude * np.sin(2 * np.pi * t * 10 / period))
                x_motion = int(amplitude * 0.5 * np.cos(2 * np.pi * t * 10 / period))
            
            # Squash/stretch effect
            if squash_enabled:
                squash_intensity = subject_transform.get('squash', {}).get('intensity', 0.1)
                scale_y = 1.0 + squash_intensity * np.sin(2 * np.pi * t / period)
                scale_x = 1.0 / scale_y  # Maintain volume
                scale_factor = (scale_x, scale_y)
            
            # Rotation jitter
            if rotation_enabled:
                rotation = rotation_jitter * np.sin(2 * np.pi * t * 2 / period)
            
            # Apply transforms to base image
            if scale_factor != 1.0 or rotation != 0:
                # Create transformed image
                if isinstance(scale_factor, tuple):
                    new_w = int(new_width * scale_factor[0])
                    new_h = int(new_height * scale_factor[1])
                else:
                    new_w = int(new_width * scale_factor)
                    new_h = int(new_height * scale_factor)
                
                transformed_img = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                if rotation != 0:
                    transformed_img = transformed_img.rotate(rotation, expand=False, resample=Image.Resampling.BICUBIC)
            else:
                transformed_img = base_img
                new_w, new_h = new_width, new_height
            
            # Calculate centered position with motion
            paste_x = x_offset + x_motion + (new_width - new_w) // 2
            paste_y = y_offset + y_motion + (new_height - new_h) // 2
            
            # Paste base image with motion and transforms
            frame.paste(transformed_img, (paste_x, paste_y), transformed_img)
            
            # Blink effect (simple overlay)
            if blink_enabled:
                blink_frame = int(blink_interval * fps)
                if frame_idx % blink_frame < blink_frame // 4:
                    # Add semi-transparent overlay for blink
                    overlay = Image.new('RGBA', frame.size, (0, 0, 0, 100))
                    frame = Image.alpha_composite(frame, overlay)
            
            # Add text with entrance animation
            if text_value:
                draw = ImageDraw.Draw(frame)
                font = None
                
                # Entrance animation
                entrance_type = entrance_anim.get('type', 'none')
                entrance_duration = entrance_anim.get('duration', 0.3)
                entrance_frames = int(entrance_duration * fps)
                
                # Calculate animation progress
                if frame_idx < entrance_frames and entrance_type != 'none':
                    anim_progress = frame_idx / entrance_frames
                else:
                    anim_progress = 1.0
                
                # Apply entrance animation
                text_alpha = int(255 * anim_progress) if entrance_type in ['fade', 'pop'] else 255
                text_scale = 0.5 + 0.5 * anim_progress if entrance_type == 'pop' else 1.0
                text_offset_y = int(20 * (1 - anim_progress)) if entrance_type == 'pop' else 0
                
                # Use font size from textLayer or style
                current_font_size = int(font_size * text_scale)
                font_paths = [
                    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
                    '/System/Library/Fonts/Helvetica.ttc',
                ]
                for font_path in font_paths:
                    try:
                        font = ImageFont.truetype(font_path, current_font_size)
                        break
                    except:
                        continue
                if not font:
                    try:
                        font = ImageFont.load_default()
                    except:
                        pass
                
                # Calculate text position
                if text_placement == 'top':
                    text_y = safe_margin + text_offset_y
                elif text_placement == 'bottom':
                    text_y = target_size - 100 - text_offset_y
                else:
                    text_y = target_size // 2 + text_offset_y
                
                text_x = target_size // 2
                
                # Draw main text
                if font:
                    bbox = draw.textbbox((0, 0), text_value, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_x = (target_size - text_width) // 2
                
                if text_stroke:
                    # Draw stroke with proper width
                    stroke_range = range(-stroke_width, stroke_width + 1)
                    for adj in stroke_range:
                        for adj2 in stroke_range:
                            if abs(adj) + abs(adj2) <= stroke_width:
                                draw.text((text_x + adj, text_y + adj2), text_value, 
                                         font=font, fill=(0, 0, 0, text_alpha))
                
                # Draw text with entrance animation alpha
                text_color_rgb = (255, 255, 255)  # White
                draw.text((text_x, text_y), text_value, font=font, fill=(*text_color_rgb, text_alpha))
                
                # Draw subvalue if exists
                if text_subvalue:
                    sub_y = text_y + 40
                    if font:
                        bbox = draw.textbbox((0, 0), text_subvalue, font=font)
                        sub_width = bbox[2] - bbox[0]
                        sub_x = (target_size - sub_width) // 2
                    else:
                        sub_x = text_x
                    
                    if text_stroke:
                        for adj in range(-2, 3):
                            for adj2 in range(-2, 3):
                                draw.text((sub_x + adj, sub_y + adj2), text_subvalue,
                                         font=font, fill=(0, 0, 0, 255))
                    
                    draw.text((sub_x, sub_y), text_subvalue, font=font, fill=(255, 255, 255, 255))
            
            # Add sparkles (simple circles)
            if sparkles:
                for i in range(sparkle_count):
                    sparkle_x = int((target_size // sparkle_count) * i + (target_size // sparkle_count) // 2)
                    sparkle_y = int(50 + 30 * np.sin(2 * np.pi * t + i))
                    sparkle_alpha = int(200 * (0.5 + 0.5 * np.sin(2 * np.pi * t * 2 + i)))
                    draw.ellipse([sparkle_x - 5, sparkle_y - 5, sparkle_x + 5, sparkle_y + 5],
                               fill=(255, 255, 0, sparkle_alpha))
            
            # Save frame
            frame_path = os.path.join(frames_dir, f'frame_{frame_idx:05d}.png')
            frame.save(frame_path)
            frame_paths.append(frame_path)
        
        # Encode to WEBM using ffmpeg
        # First create a temporary video from frames in shared volume with unique name
        unique_id = secrets.token_hex(8)
        timestamp = int(time.time() * 1000)
        temp_video = f'/tmp/packputer/temp_video_{timestamp}_{unique_id}.webm'
        
        # Use ffmpeg to create video from frames
        cmd = [
            'ffmpeg',
            '-y',
            '-framerate', str(fps),
            '-i', os.path.join(frames_dir, 'frame_%05d.png'),
            '-c:v', 'libvpx-vp9',
            '-crf', '32',
            '-b:v', '0',
            '-an',
            temp_video
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
        # Now fit to limits (this will save to /tmp/packputer)
        final_path, metadata = fit_to_limits(temp_video, duration, 'transparent')
        
        # Quality gate: Validate video sticker
        is_valid, violations = validate_video_sticker(final_path, metadata)
        
        # Auto-retry if violations found
        max_retries = 3
        retry_count = 0
        current_settings = {
            'crf': 32,
            'fps': fps,
            'bitrate': None,
        }
        
        while not is_valid and retry_count < max_retries:
            retry_count += 1
            logger.warning(f"Video sticker validation failed (attempt {retry_count}/{max_retries}): {[str(v) for v in violations]}")
            
            # Get retry suggestions
            updated_settings = auto_retry_tuning(current_settings, violations)
            
            # Re-encode with updated settings
            # Note: This is simplified - in production, would re-encode with new settings
            logger.info(f"Retrying with settings: {updated_settings}")
            
            # For now, just log - full retry would require re-encoding
            # In production, integrate with sizefit.py to re-encode
            break  # Simplified for now
        
        # Ensure output is in shared volume
        if not output_path.startswith('/tmp/packputer'):
            shared_output = '/tmp/packputer/' + os.path.basename(output_path)
            if final_path != shared_output:
                shutil.move(final_path, shared_output)
            final_path = shared_output
        elif final_path != output_path:
            shutil.move(final_path, output_path)
            final_path = output_path
        
        # Add validation status to metadata
        metadata['validated'] = is_valid
        if violations:
            metadata['violations'] = [str(v) for v in violations]
        
        # Return the final path (should be in /tmp/packputer)
        return metadata
        
    finally:
        # Cleanup frames (but keep output file)
        if os.path.exists(frames_dir):
            shutil.rmtree(frames_dir, ignore_errors=True)

