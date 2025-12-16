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
        # Create temp file
        suffix = os.path.splitext(file.filename or 'input')[1] or '.tmp'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_input = tmp.name
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

