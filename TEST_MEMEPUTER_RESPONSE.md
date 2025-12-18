# Test Memeputer API Response

## Without jq (see raw response)

```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}'
```

## Install jq (optional, for pretty JSON)

```bash
apt update && apt install -y jq
```

Then run the command again with `| jq .` at the end.

## Check Response Status

```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

## Try Different Endpoints

If `/chat` doesn't work, try:

### Option 1: /messages
```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/messages" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}'
```

### Option 2: /generate (if exists)
```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/generate" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "GM", "project_context": "crypto project"}'
```

### Option 3: Check what endpoints are available
```bash
curl -X GET "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json"
```

## Parse Response in Python (if jq not available)

```bash
python3 << 'EOF'
import json
import sys

# Paste the curl response here or read from file
response = '{"your": "response"}'
data = json.loads(response)
print(json.dumps(data, indent=2))
EOF
```

