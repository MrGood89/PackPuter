# Analyze Memeputer API Response

## Step 1: Get the Raw Response

Run this on your VM and **copy the full output**:

```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' \
  -v
```

The `-v` flag will show:
- HTTP status code
- Response headers
- Response body

## Step 2: Format with Python

If you get a response, format it:

```bash
# Save response to file
curl -s -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' > response.json

# Format it
python3 -m json.tool response.json
```

## Step 3: Check Response Structure

Based on the response, we need to know:

1. **Is it successful?** (HTTP 200?)
2. **What's the structure?**
   - `response.data.message` - text response?
   - `response.data.blueprint` - JSON blueprint?
   - `response.data.response` - nested response?
   - `response.data.data` - nested data?

3. **Is the blueprint in the response?**
   - As JSON string in message?
   - As structured object?
   - Need to parse from text?

## Common Response Formats

### Format 1: Direct Blueprint
```json
{
  "blueprint": {
    "duration_sec": 2.5,
    "fps": 20,
    "text": {...}
  }
}
```

### Format 2: Message with JSON
```json
{
  "message": "{\"duration_sec\": 2.5, \"fps\": 20, ...}"
}
```

### Format 3: Nested Response
```json
{
  "data": {
    "response": {
      "blueprint": {...}
    }
  }
}
```

### Format 4: Error
```json
{
  "error": "Endpoint not found",
  "status": 404
}
```

## Next Steps

Once you share the response, I'll update the code to parse it correctly!

