import os
import secrets
import time
import logging
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
from .convert import convert_file
from .batch import batch_convert_files
from .render import render_animation
from .sticker_asset import prepareStickerAsset, validate_sticker_asset
from .quality_gates import validate_image_sticker, validate_video_sticker

logger = logging.getLogger(__name__)

app = FastAPI(title="PackPuter Worker")

@app.post("/convert")
async def convert_endpoint(
    file: UploadFile = File(...),
    prefer_seconds: float = Form(2.8),
    pad_mode: str = Form("transparent")
):
    """Convert a single file to sticker format."""
    try:
        output_path, metadata = await convert_file(file, prefer_seconds, pad_mode)
        
        return JSONResponse({
            "output_path": output_path,
            **metadata
        })
    except Exception as e:
        return JSONResponse(
            {"error": str(e)},
            status_code=500
        )

@app.post("/batch_convert")
async def batch_convert_endpoint(
    files: List[UploadFile] = File(...)
):
    """Convert multiple files to stickers."""
    try:
        if len(files) > 10:
            return JSONResponse(
                {"error": "Maximum 10 files allowed"},
                status_code=400
            )
        
        results = await batch_convert_files(files, max_files=10)
        
        items = []
        for output_path, metadata in results:
            items.append({
                "output_path": output_path,
                **metadata
            })
        
        return JSONResponse({
            "items": items
        })
    except Exception as e:
        return JSONResponse(
            {"error": str(e)},
            status_code=500
        )

@app.post("/ai/render")
async def ai_render_endpoint(
    base_image: UploadFile = File(...),
    blueprint_json: str = Form(...)
):
    """Render animated sticker from base image and blueprint."""
    try:
        # Save base image temporarily
        temp_input = None
        temp_output = None
        try:
            # Use shared volume for bot access
            temp_dir = '/tmp/packputer'
            os.makedirs(temp_dir, exist_ok=True)
            
            suffix = os.path.splitext(base_image.filename or 'input')[1] or '.png'
            # Use timestamp + 8 bytes (16 hex chars) for better uniqueness
            timestamp = int(time.time() * 1000)
            temp_input = os.path.join(temp_dir, f'ai_input_{timestamp}_{secrets.token_hex(8)}{suffix}')
            with open(temp_input, 'wb') as tmp:
                await base_image.seek(0)
                content = await base_image.read()
                tmp.write(content)
            
            # Create output path in shared volume with unique name
            temp_output = os.path.join(temp_dir, f'ai_output_{timestamp}_{secrets.token_hex(8)}.webm')
            
            # Render
            metadata = render_animation(temp_input, blueprint_json, temp_output)
            
            return JSONResponse({
                "output_path": temp_output,
                **metadata
            })
        finally:
            # Cleanup input
            if temp_input and os.path.exists(temp_input):
                try:
                    os.unlink(temp_input)
                except:
                    pass
    except Exception as e:
        return JSONResponse(
            {"error": str(e)},
            status_code=500
        )

@app.post("/sticker/prepare-asset")
async def prepare_asset_endpoint(
    base_image: UploadFile = File(...)
):
    """Prepare a base image into a Telegram-ready sticker asset."""
    try:
        # Save uploaded file temporarily
        temp_dir = '/tmp/packputer'
        os.makedirs(temp_dir, exist_ok=True)
        
        suffix = os.path.splitext(base_image.filename or 'input')[1] or '.png'
        timestamp = int(time.time() * 1000)
        temp_input = os.path.join(temp_dir, f'asset_input_{timestamp}_{secrets.token_hex(8)}{suffix}')
        
        with open(temp_input, 'wb') as tmp:
            await base_image.seek(0)
            content = await base_image.read()
            tmp.write(content)
        
        # Prepare asset
        output_path = prepareStickerAsset(temp_input)
        
        # Quality gate: Validate prepared asset
        try:
            from PIL import Image
            img = Image.open(output_path)
            validate_sticker_asset(img)
            is_valid = True
            violations = []
        except Exception as e:
            is_valid = False
            violations = [str(e)]
            logger.warning(f"Asset validation failed: {e}")
        
        return JSONResponse({
            "output_path": output_path,
            "status": "success" if is_valid else "warning",
            "validated": is_valid,
            "violations": violations if not is_valid else []
        })
    except Exception as e:
        logger.error(f"Error preparing sticker asset: {e}")
        return JSONResponse(
            {"error": str(e)},
            status_code=500
        )

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

