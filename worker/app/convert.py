import os
import shutil
import tempfile
from fastapi import UploadFile
from .sizefit import fit_to_limits

async def convert_file(
    file: UploadFile,
    prefer_seconds: float = 2.8,
    pad_mode: str = 'transparent'
) -> tuple[str, dict]:
    """Convert uploaded file to sticker format."""
    # Save uploaded file temporarily
    temp_input = None
    try:
        # Create temp file in shared volume with unique name
        suffix = os.path.splitext(file.filename or 'input')[1] or '.tmp'
        temp_dir = '/tmp/packputer'
        os.makedirs(temp_dir, exist_ok=True)
        # Use 8 bytes (16 hex chars) + timestamp for better uniqueness
        temp_input = os.path.join(temp_dir, f'input_{int(time.time() * 1000)}_{secrets.token_hex(8)}{suffix}')
        with open(temp_input, 'wb') as tmp:
            shutil.copyfileobj(file.file, tmp)
        
        # Convert
        output_path, metadata = fit_to_limits(temp_input, prefer_seconds, pad_mode)
        
        return output_path, metadata
    finally:
        # Cleanup input
        if temp_input and os.path.exists(temp_input):
            try:
                os.unlink(temp_input)
            except:
                pass

