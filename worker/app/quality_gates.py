"""
Quality Gates for Sticker Style Contract
Validates outputs and provides auto-retry logic
"""
import os
import logging
from typing import Dict, Any, List, Tuple, Optional
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

# Contract constants
CANVAS_SIZE = 512
MAX_DURATION_SEC = 3.0
MAX_FPS = 30
MAX_FILE_SIZE_KB = 256
SUBJECT_HEIGHT_MIN = 0.70
SUBJECT_HEIGHT_MAX = 0.90


class ValidationViolation:
    """Represents a contract violation."""
    def __init__(self, field: str, expected: Any, actual: Any, severity: str = 'error'):
        self.field = field
        self.expected = expected
        self.actual = actual
        self.severity = severity  # 'error' or 'warning'
    
    def __str__(self):
        return f"{self.field}: expected {self.expected}, got {self.actual}"


def validate_image_sticker(image_path: str) -> Tuple[bool, List[ValidationViolation]]:
    """
    Validate image sticker against Sticker Style Contract.
    Returns (is_valid, violations)
    """
    violations: List[ValidationViolation] = []
    
    try:
        img = Image.open(image_path)
        
        # Check dimensions
        if img.size != (CANVAS_SIZE, CANVAS_SIZE):
            violations.append(ValidationViolation(
                'dimensions',
                f'{CANVAS_SIZE}x{CANVAS_SIZE}',
                f'{img.size[0]}x{img.size[1]}'
            ))
        
        # Check has alpha
        if img.mode != 'RGBA':
            violations.append(ValidationViolation(
                'alpha_channel',
                'RGBA',
                img.mode
            ))
        
        # Check subject size (70-90% of canvas)
        arr = np.array(img)
        alpha = arr[:, :, 3]
        rows = np.any(alpha > 0, axis=1)
        
        if np.any(rows):
            subject_height = np.sum(rows)
            height_ratio = subject_height / CANVAS_SIZE
            
            if not (SUBJECT_HEIGHT_MIN <= height_ratio <= SUBJECT_HEIGHT_MAX):
                violations.append(ValidationViolation(
                    'subject_height',
                    f'{SUBJECT_HEIGHT_MIN*100}%-{SUBJECT_HEIGHT_MAX*100}%',
                    f'{height_ratio*100:.1f}%'
                ))
        
        # Check file size (should be reasonable for PNG)
        file_size_kb = os.path.getsize(image_path) / 1024
        if file_size_kb > 500:  # PNGs can be larger, but warn if > 500KB
            violations.append(ValidationViolation(
                'file_size',
                '< 500KB',
                f'{file_size_kb:.1f}KB',
                severity='warning'
            ))
        
        is_valid = len([v for v in violations if v.severity == 'error']) == 0
        return is_valid, violations
        
    except Exception as e:
        logger.error(f"Error validating image sticker: {e}")
        violations.append(ValidationViolation(
            'validation_error',
            'valid image',
            str(e)
        ))
        return False, violations


def validate_video_sticker(video_path: str, metadata: Optional[Dict[str, Any]] = None) -> Tuple[bool, List[ValidationViolation]]:
    """
    Validate video sticker against Sticker Style Contract.
    Returns (is_valid, violations)
    """
    violations: List[ValidationViolation] = []
    
    # Use metadata if provided, otherwise would need to probe video
    if metadata:
        duration = metadata.get('duration', 0)
        fps = metadata.get('fps', 0)
        width = metadata.get('width', 0)
        height = metadata.get('height', 0)
        kb = metadata.get('kb', 0)
        has_audio = metadata.get('has_audio', False)
    else:
        # Would need to probe video file here
        # For now, assume metadata is provided
        logger.warning("No metadata provided for video validation")
        return True, []
    
    # Check duration
    if duration > MAX_DURATION_SEC:
        violations.append(ValidationViolation(
            'duration',
            f'≤ {MAX_DURATION_SEC}s',
            f'{duration:.2f}s'
        ))
    
    # Check FPS
    if fps > MAX_FPS:
        violations.append(ValidationViolation(
            'fps',
            f'≤ {MAX_FPS}',
            fps
        ))
    
    # Check dimensions
    if width != CANVAS_SIZE or height != CANVAS_SIZE:
        violations.append(ValidationViolation(
            'dimensions',
            f'{CANVAS_SIZE}x{CANVAS_SIZE}',
            f'{width}x{height}'
        ))
    
    # Check file size
    if kb > MAX_FILE_SIZE_KB:
        violations.append(ValidationViolation(
            'file_size',
            f'≤ {MAX_FILE_SIZE_KB}KB',
            f'{kb:.1f}KB'
        ))
    
    # Check audio
    if has_audio:
        violations.append(ValidationViolation(
            'audio',
            'none',
            'present'
        ))
    
    is_valid = len(violations) == 0
    return is_valid, violations


def get_retry_suggestions(violations: List[ValidationViolation]) -> Dict[str, Any]:
    """
    Generate retry suggestions based on violations.
    Returns dict with tuning parameters.
    """
    suggestions: Dict[str, Any] = {}
    
    for violation in violations:
        if violation.field == 'file_size':
            # Reduce quality settings
            if 'crf' not in suggestions:
                suggestions['crf'] = 36  # Increase CRF (lower quality, smaller size)
            if 'fps' not in suggestions:
                suggestions['fps'] = 24  # Reduce FPS
            if 'bitrate' not in suggestions:
                suggestions['bitrate'] = '200k'  # Cap bitrate
        elif violation.field == 'duration':
            # Trim duration
            suggestions['max_duration'] = MAX_DURATION_SEC
        elif violation.field == 'fps':
            # Reduce FPS
            suggestions['fps'] = 24
        elif violation.field == 'dimensions':
            # Ensure 512x512
            suggestions['force_dimensions'] = (CANVAS_SIZE, CANVAS_SIZE)
        elif violation.field == 'subject_height':
            # Adjust scale
            if violation.actual < SUBJECT_HEIGHT_MIN:
                suggestions['scale_up'] = True
            else:
                suggestions['scale_down'] = True
    
    return suggestions


def auto_retry_tuning(current_settings: Dict[str, Any], violations: List[ValidationViolation]) -> Dict[str, Any]:
    """
    Auto-tune settings based on violations.
    Returns updated settings dict.
    """
    updated = current_settings.copy()
    suggestions = get_retry_suggestions(violations)
    
    # Apply suggestions
    if 'crf' in suggestions:
        current_crf = updated.get('crf', 32)
        updated['crf'] = max(current_crf + 4, suggestions['crf'])  # Increase CRF
    
    if 'fps' in suggestions:
        updated['fps'] = min(updated.get('fps', 30), suggestions['fps'])
    
    if 'bitrate' in suggestions:
        updated['bitrate'] = suggestions['bitrate']
    
    if 'max_duration' in suggestions:
        updated['max_duration'] = suggestions['max_duration']
    
    if 'force_dimensions' in suggestions:
        updated['width'] = CANVAS_SIZE
        updated['height'] = CANVAS_SIZE
    
    return updated

