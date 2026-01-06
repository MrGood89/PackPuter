import os
import tempfile
import secrets
import time
import sys
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
    duration, width, height, fps, pix_fmt, has_audio = probe_media(input_path)
    
    # Trim to max duration
    actual_duration = min(duration, MAX_SECONDS, prefer_seconds)
    
    # Start with best quality first, only degrade if needed
    # This is MUCH faster than trying all combinations
    current_fps = min(int(fps), MAX_FPS)
    current_crf = 32
    current_side = TARGET_SIDE
    
    # Degradation order: Try best quality first, then progressively reduce
    # Order: CRF (quality) → FPS → Size (only if really needed)
    crf_options = [32, 36, 40, 44]  # Lower CRF = better quality, larger file
    fps_options = [30, 24, 20, 15] if MAX_FPS >= 30 else [MAX_FPS, MAX_FPS - 5, MAX_FPS - 10]
    side_options = [512, 480, 448]  # Only reduce size if CRF and FPS reduction isn't enough
    
    best_path = None
    best_size = float('inf')
    best_metadata = {}
    
    # Use shared volume for bot access
    temp_dir = '/tmp/packputer'
    os.makedirs(temp_dir, exist_ok=True)
    
    # Try best quality first (CRF 32, max FPS, 512px)
    # Only try lower quality if file is too large
    print(f"[sizefit] Starting compression with best quality: CRF=32, FPS={current_fps}, Side={TARGET_SIDE}", flush=True)
    
    for crf_val in crf_options:
        for fps_val in fps_options:
            if fps_val > MAX_FPS:
                continue
            
            # Try full size first, only reduce if needed
            for side in [TARGET_SIDE] + [s for s in side_options if s < TARGET_SIDE]:
                # Use unique identifier instead of input filename to avoid collisions
                unique_id = secrets.token_hex(8)  # 16 hex chars
                timestamp = int(time.time() * 1000)
                output_path = os.path.join(
                    temp_dir,
                    f'sticker_{timestamp}_{unique_id}_{side}_{fps_val}_{crf_val}.webm'
                )
                
                # Try encoding (preserve alpha for transparent stickers)
                print(f"[sizefit] Attempting encode: CRF={crf_val}, FPS={fps_val}, Side={side}, Duration={actual_duration}", flush=True)
                start_time = time.time()
                if encode_webm(input_path, output_path, fps_val, crf_val, side, actual_duration, preserve_alpha=True):
                    encode_time = time.time() - start_time
                    size_kb = get_file_size_kb(output_path)
                    print(f"[sizefit] ✅ Encode successful: {size_kb}KB (CRF={crf_val}, FPS={fps_val}, Side={side}) in {encode_time:.1f}s", flush=True)
                    
                    if size_kb <= MAX_STICKER_KB:
                        # Found a valid result - use it immediately (don't keep trying)
                        if best_path and os.path.exists(best_path):
                            try:
                                os.unlink(best_path)
                            except:
                                pass
                        
                        best_path = output_path
                        best_size = size_kb
                        # Probe output to get actual pixel format
                        _, _, _, _, output_pix_fmt, output_has_audio = probe_media(output_path)
                        best_metadata = {
                            'duration': actual_duration,
                            'kb': size_kb,
                            'width': side,
                            'height': side,
                            'fps': fps_val,
                            'pix_fmt': output_pix_fmt or 'yuva420p'
                        }
                        
                        print(f"[sizefit] ✅ Found valid sticker: {size_kb}KB (CRF={crf_val}, FPS={fps_val}, Side={side})", flush=True)
                        # Exit immediately - we found a good result
                        break
                    elif size_kb < best_size:
                        # Keep track of best attempt even if too large (for fallback)
                        if best_path and os.path.exists(best_path):
                            try:
                                os.unlink(best_path)
                            except:
                                pass
                        
                        best_path = output_path
                        best_size = size_kb
                        _, _, _, _, output_pix_fmt, output_has_audio = probe_media(output_path)
                        best_metadata = {
                            'duration': actual_duration,
                            'kb': size_kb,
                            'width': side,
                            'height': side,
                            'fps': fps_val,
                            'pix_fmt': output_pix_fmt or 'yuva420p'
                        }
                        # Cleanup previous best
                        if best_path and os.path.exists(best_path):
                            try:
                                os.unlink(best_path)
                            except:
                                pass
                        
                        best_path = output_path
                        best_size = size_kb
                        # Probe output to get actual pixel format
                        _, _, _, _, output_pix_fmt, output_has_audio = probe_media(output_path)
                        best_metadata = {
                            'duration': actual_duration,
                            'kb': size_kb,
                            'width': side,
                            'height': side,
                            'fps': fps_val,
                            'pix_fmt': output_pix_fmt or 'yuva420p'  # Default to expected format
                        }
                        
                        # Found good result, break inner loops
                        break
                        print(f"[sizefit] ⚠️ Size too large: {size_kb}KB > {MAX_STICKER_KB}KB, trying lower quality...", flush=True)
                        # Don't cleanup - keep as best attempt, but continue trying
                    else:
                        # This attempt is worse than previous best, cleanup
                        if os.path.exists(output_path):
                            try:
                                os.unlink(output_path)
                            except:
                                pass
                else:
                    encode_time = time.time() - start_time
                    print(f"[sizefit] ❌ Encode failed: CRF={crf_val}, FPS={fps_val}, Side={side} (took {encode_time:.1f}s)", flush=True)
                    # Cleanup failed encode
                    if os.path.exists(output_path):
                        try:
                            os.unlink(output_path)
                        except:
                            pass
                
                # If we found a valid result (under size limit), exit immediately
                if best_path and best_size <= MAX_STICKER_KB:
                    break
            
            # Exit outer loops if we found a valid result
            if best_path and best_size <= MAX_STICKER_KB:
                break
        
        # Exit CRF loop if we found a valid result
        if best_path and best_size <= MAX_STICKER_KB:
            break
    
    if not best_path or not os.path.exists(best_path):
        raise ValueError('Failed to create compliant sticker')
    
    return best_path, best_metadata

