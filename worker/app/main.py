import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
from .convert import convert_file
from .batch import batch_convert_files
from .render import render_animation
import tempfile

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
            suffix = os.path.splitext(base_image.filename or 'input')[1] or '.png'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                temp_input = tmp.name
                await base_image.seek(0)
                content = await base_image.read()
                tmp.write(content)
            
            # Create output path
            temp_output = tempfile.NamedTemporaryFile(delete=False, suffix='.webm').name
            
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

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

