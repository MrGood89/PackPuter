import os
from typing import List
from fastapi import UploadFile
from .convert import convert_file

async def batch_convert_files(
    files: List[UploadFile],
    max_files: int = 10
) -> List[tuple[str, dict]]:
    """Convert multiple files to stickers."""
    if len(files) > max_files:
        raise ValueError(f'Maximum {max_files} files allowed')
    
    results = []
    for file in files:
        try:
            output_path, metadata = await convert_file(file)
            results.append((output_path, metadata))
        except Exception as e:
            print(f"Error converting {file.filename}: {e}")
            # Continue with other files
            continue
    
    return results

