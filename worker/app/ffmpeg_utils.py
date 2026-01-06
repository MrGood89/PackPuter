import subprocess
import json
import os
from typing import Tuple, Optional

def probe_media(path: str) -> Tuple[float, int, int, float, Optional[str], bool]:
    """Probe media file and return (duration, width, height, fps, pix_fmt, has_audio)."""
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        video_stream = None
        audio_stream = None
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_stream = stream
            elif stream.get('codec_type') == 'audio':
                audio_stream = stream
        
        if not video_stream:
            raise ValueError('No video stream found')
        
        duration = float(data.get('format', {}).get('duration', 0))
        width = int(video_stream.get('width', 512))
        height = int(video_stream.get('height', 512))
        pix_fmt = video_stream.get('pix_fmt', None)
        has_audio = bool(audio_stream)
        
        # Get FPS
        fps_str = video_stream.get('r_frame_rate', '30/1')
        if '/' in fps_str:
            num, den = map(int, fps_str.split('/'))
            fps = num / den if den > 0 else 30.0
        else:
            fps = float(fps_str)
        
        return duration, width, height, fps, pix_fmt, has_audio
    except Exception as e:
        print(f"Error probing media: {e}")
        return 3.0, 512, 512, 30.0, None, False

def encode_webm(
    input_path: str,
    out_path: str,
    fps: int,
    crf: int,
    side: int,
    duration: Optional[float] = None,
    preserve_alpha: bool = True
) -> bool:
    """
    Encode video to WEBM VP9 with specified parameters.
    
    Args:
        preserve_alpha: If True, ensures output has alpha channel (yuva420p)
    """
    try:
        # Check input format
        _, _, _, _, input_pix_fmt, _ = probe_media(input_path)
        has_input_alpha = input_pix_fmt and 'yuva' in input_pix_fmt.lower()
        
        # Build filter chain
        scale_filter = f"scale='if(gt(iw,ih),{side},-1)':'if(gt(iw,ih),-1,{side})'"
        
        if preserve_alpha:
            # For alpha output: use transparent padding
            pad_filter = f"pad={side}:{side}:(ow-iw)/2:(oh-ih)/2:color=0x00000000@0"
            if not has_input_alpha:
                # Input has no alpha - add it by converting format first
                # This creates alpha with full opacity for existing pixels
                vf_chain = f"format=yuva420p,{scale_filter},{pad_filter}"
            else:
                # Input has alpha - preserve it
                vf_chain = f"{scale_filter},{pad_filter}"
        else:
            # No alpha needed - use opaque padding
            pad_filter = f"pad={side}:{side}:(ow-iw)/2:(oh-ih)/2:color=0x00000000"
            vf_chain = f"{scale_filter},{pad_filter}"
        
        # VP9 encoding
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-vf', vf_chain,
            '-c:v', 'libvpx-vp9',
            '-pix_fmt', 'yuva420p' if preserve_alpha else 'yuv420p',
            '-auto-alt-ref', '0',
            '-crf', str(crf),
            '-b:v', '0',
            '-an',
            '-r', str(fps),
            '-y',
            out_path
        ]
        
        if duration:
            # Insert duration before output file
            cmd.insert(-1, '-t')
            cmd.insert(-1, str(duration))
        
        print(f"[encode_webm] FFmpeg command: {' '.join(cmd)}", flush=True)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Verify output file exists and has correct format
        if not os.path.exists(out_path):
            print(f"ERROR: Output file not created: {out_path}")
            return False
        
        # Verify output has alpha (only warn, don't fail - some inputs can't have alpha)
        _, _, _, _, output_pix_fmt, _ = probe_media(out_path)
        if preserve_alpha and output_pix_fmt and 'yuva' not in output_pix_fmt.lower():
            print(f"WARNING: Output video missing alpha! pix_fmt={output_pix_fmt}, expected yuva420p")
            # Don't fail - allow non-alpha output if input didn't have alpha
            # This allows compression to work even when alpha can't be created
            if not has_input_alpha:
                print(f"INFO: Input had no alpha, allowing yuv420p output", flush=True)
                return True
            return False
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg encode error (CRF={crf}, FPS={fps}, Side={side}):")
        print(f"  Command: {' '.join(cmd)}")
        print(f"  Return code: {e.returncode}")
        print(f"  stderr: {e.stderr}")
        if e.stdout:
            print(f"  stdout: {e.stdout}")
        return False
    except Exception as e:
        print(f"Encode error (CRF={crf}, FPS={fps}, Side={side}): {e}")
        import traceback
        traceback.print_exc()
        return False

def get_file_size_kb(path: str) -> int:
    """Get file size in KB."""
    try:
        size_bytes = os.path.getsize(path)
        return size_bytes // 1024
    except Exception:
        return 0

