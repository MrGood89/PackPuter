import os
import tempfile
from typing import Tuple, Optional
from .ffmpeg_utils import probe_media, encode_webm, get_file_size_kb

MAX_STICKER_KB = int(os.getenv('MAX_STICKER_KB', '256'))
MAX_SECONDS = float(os.getenv('MAX_SECONDS', '3.0'))
MAX_FPS = int(os.getenv('MAX_FPS', '30'))
TARGET_SIDE = int(os.getenv('TARGET_SIDE', '512'))

def fit_to_limits(
    input_path: str,
    prefer_seconds: float = 2.8,
    pad_mode: str = 'transparent'
) -> Tuple[str, dict]:
    """
    Convert media to Telegram-compliant WEBM VP9 sticker.
    Returns (output_path, metadata).
    """
    # Probe input
    duration, width, height, fps = probe_media(input_path)
    
    # Trim to max duration
    actual_duration = min(duration, MAX_SECONDS, prefer_seconds)
    
    # Start with good defaults
    current_fps = min(int(fps), MAX_FPS)
    current_crf = 32
    current_side = TARGET_SIDE
    
    # Iteration parameters
    fps_options = [30, 24, 20, 15] if MAX_FPS >= 30 else [MAX_FPS, MAX_FPS - 5, MAX_FPS - 10]
    crf_options = [32, 36, 40, 44]
    side_options = [512, 480, 448]
    
    best_path = None
    best_size = float('inf')
    best_metadata = {}
    
    # Use shared volume for bot access
    temp_dir = '/tmp/packputer'
    os.makedirs(temp_dir, exist_ok=True)
    
    for side in side_options:
        if side > TARGET_SIDE:
            continue
            
        for fps_val in fps_options:
            if fps_val > MAX_FPS:
                continue
                
            for crf_val in crf_options:
                output_path = os.path.join(
                    temp_dir,
                    f'sticker_{os.path.basename(input_path)}_{side}_{fps_val}_{crf_val}.webm'
                )
                
                # Try encoding
                if encode_webm(input_path, output_path, fps_val, crf_val, side, actual_duration):
                    size_kb = get_file_size_kb(output_path)
                    
                    if size_kb <= MAX_STICKER_KB and size_kb < best_size:
                        # Cleanup previous best
                        if best_path and os.path.exists(best_path):
                            try:
                                os.unlink(best_path)
                            except:
                                pass
                        
                        best_path = output_path
                        best_size = size_kb
                        best_metadata = {
                            'duration': actual_duration,
                            'kb': size_kb,
                            'width': side,
                            'height': side,
                            'fps': fps_val
                        }
                        
                        # Found good result, break inner loops
                        break
                    else:
                        # Cleanup failed attempt
                        if os.path.exists(output_path):
                            try:
                                os.unlink(output_path)
                            except:
                                pass
                else:
                    # Cleanup failed encode
                    if os.path.exists(output_path):
                        try:
                            os.unlink(output_path)
                        except:
                            pass
                
                # If we found a good result, break
                if best_path and best_size <= MAX_STICKER_KB:
                    break
            
            if best_path and best_size <= MAX_STICKER_KB:
                break
        
        if best_path and best_size <= MAX_STICKER_KB:
            break
    
    if not best_path or not os.path.exists(best_path):
        raise ValueError('Failed to create compliant sticker')
    
    return best_path, best_metadata

