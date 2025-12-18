import json
from typing import Dict, Any, Optional

def parse_blueprint(blueprint_json: str) -> Dict[str, Any]:
    """Parse blueprint JSON string."""
    try:
        return json.loads(blueprint_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid blueprint JSON: {e}")

def validate_blueprint(blueprint: Dict[str, Any]) -> bool:
    """Validate blueprint structure."""
    required = ['duration_sec', 'fps', 'loop']
    return all(key in blueprint for key in required)

def get_blueprint_defaults() -> Dict[str, Any]:
    """Get default blueprint values following Sticker Style Contract."""
    return {
        'duration_sec': 2.8,
        'fps': 30,
        'loop': True,
        'text': {
            'value': 'GM',
            'placement': 'top',
            'stroke': True,
        },
        'motion': {
            'type': 'bounce',
            'amplitude_px': 10,
            'period_sec': 1.0,
        },
        'effects': {
            'sparkles': False,
        },
        'qualityHints': {
            'fileSizeBudgetKB': 240,  # Leave headroom under 256KB
        },
    }

def enhance_blueprint_with_sticker_grade_motion(blueprint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enhance blueprint with sticker-grade motion fields.
    Adds subjectTransform, textLayer with entrance animation, and quality hints.
    """
    enhanced = blueprint.copy()
    
    # Add subjectTransform if not present
    if 'subjectTransform' not in enhanced:
        motion = enhanced.get('motion', {})
        enhanced['subjectTransform'] = {
            'bounce': {
                'amplitude': motion.get('amplitude_px', 10),
                'period': motion.get('period_sec', 1.0),
            },
            'squash': {
                'enabled': False,
                'intensity': 0.1,
            },
            'rotation': {
                'enabled': False,
                'jitter': 2.0,  # degrees
            },
        }
    
    # Add textLayer with entrance animation if text exists
    if 'text' in enhanced and 'textLayer' not in enhanced:
        text = enhanced['text']
        enhanced['textLayer'] = {
            'content': text.get('value', 'GM'),
            'font': 'bold',
            'size': 120,
            'stroke': text.get('stroke', True),
            'strokeWidth': 8,
            'entranceAnimation': {
                'type': 'pop',  # pop, wiggle, fade
                'duration': 0.3,  # seconds
            },
            'placement': text.get('placement', 'top'),
        }
    
    # Add quality hints if not present
    if 'qualityHints' not in enhanced:
        enhanced['qualityHints'] = {
            'fileSizeBudgetKB': 240,
            'maxFPS': 30,
            'maxDuration': 3.0,
        }
    
    return enhanced

