import os
import json
import time
import secrets
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from typing import Dict, Any
from .blueprint import parse_blueprint, validate_blueprint
from .sizefit import fit_to_limits

def render_animation(
    base_image_path: str,
    blueprint_json: str,
    output_path: str
) -> Dict[str, Any]:
    """Render animated sticker from base image and blueprint."""
    blueprint = parse_blueprint(blueprint_json)
    if not validate_blueprint(blueprint):
        raise ValueError('Invalid blueprint structure')
    
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
    font_size = style.get('fontSize', 60)  # Big readable text
    text_color = style.get('textColor', '#FFFFFF')  # White text
    stroke_color = style.get('strokeColor', '#000000')  # Black stroke
    stroke_width = style.get('strokeWidth', 3)  # Thick stroke
    outline_width = style.get('outlineWidth', 2)  # White outline
    
    # Layout settings
    layout = blueprint.get('layout', {})
    safe_margin = layout.get('safeMargin', 20)
    text_anchor = layout.get('textAnchor', 'top')
    max_text_width = layout.get('maxTextWidth', 400)
    
    # Text settings
    text_config = blueprint.get('text', {})
    text_value = text_config.get('value', '')
    text_subvalue = text_config.get('subvalue', '')
    text_placement = text_config.get('placement', text_anchor)  # Use layout anchor if provided
    text_stroke = text_config.get('stroke', True)  # Always stroke for readability
    
    # Motion settings - "sticker look" defaults
    motion = blueprint.get('motion', {})
    motion_type = motion.get('type', 'bounce')  # Default subtle bounce
    amplitude = motion.get('amplitude_px', 8)  # Subtle motion
    period = motion.get('period_sec', 1.3)
    
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
            
            # Calculate motion offset
            y_motion = 0
            if motion_type == 'bounce':
                y_motion = int(amplitude * np.sin(2 * np.pi * t / period))
            elif motion_type == 'shake':
                y_motion = int(amplitude * np.sin(2 * np.pi * t * 10 / period))
            
            # Paste base image with motion
            frame.paste(base_img, (x_offset, y_offset + y_motion), base_img)
            
            # Blink effect (simple overlay)
            if blink_enabled:
                blink_frame = int(blink_interval * fps)
                if frame_idx % blink_frame < blink_frame // 4:
                    # Add semi-transparent overlay for blink
                    overlay = Image.new('RGBA', frame.size, (0, 0, 0, 100))
                    frame = Image.alpha_composite(frame, overlay)
            
            # Add text
            if text_value:
                draw = ImageDraw.Draw(frame)
                font = None
                # Try to use a larger font
                font_size = 60
                font_paths = [
                    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
                    '/System/Library/Fonts/Helvetica.ttc',
                ]
                for font_path in font_paths:
                    try:
                        font = ImageFont.truetype(font_path, font_size)
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
                    text_y = 50
                elif text_placement == 'bottom':
                    text_y = target_size - 100
                else:
                    text_y = target_size // 2
                
                text_x = target_size // 2
                
                # Draw main text
                if font:
                    bbox = draw.textbbox((0, 0), text_value, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_x = (target_size - text_width) // 2
                
                if text_stroke:
                    # Draw stroke
                    for adj in range(-2, 3):
                        for adj2 in range(-2, 3):
                            draw.text((text_x + adj, text_y + adj2), text_value, 
                                     font=font, fill=(0, 0, 0, 255))
                
                draw.text((text_x, text_y), text_value, font=font, fill=(255, 255, 255, 255))
                
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
        
        # Ensure output is in shared volume
        if not output_path.startswith('/tmp/packputer'):
            shared_output = '/tmp/packputer/' + os.path.basename(output_path)
            if final_path != shared_output:
                shutil.move(final_path, shared_output)
            final_path = shared_output
        elif final_path != output_path:
            shutil.move(final_path, output_path)
            final_path = output_path
        
        # Return the final path (should be in /tmp/packputer)
        return metadata
        
    finally:
        # Cleanup frames (but keep output file)
        if os.path.exists(frames_dir):
            shutil.rmtree(frames_dir, ignore_errors=True)

