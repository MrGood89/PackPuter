import json
from typing import Dict, Any

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

