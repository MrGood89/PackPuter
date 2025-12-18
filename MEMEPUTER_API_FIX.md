# Memeputer API Endpoint Fix

## Issue
The bot is getting 404 errors when calling Memeputer API:
```
Cannot POST /api/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/generate
```

## Problem
The endpoint path `/api/v1/agents/{agent_id}/generate` doesn't exist in Memeputer API.

## Solution Options

### Option 1: Use Memeputer Agent Chat/Message API
Memeputer might use a chat/message API instead of direct generation endpoints.

Try these endpoints:
- `/v1/agents/{agent_id}/chat` - Send message to agent
- `/v1/agents/{agent_id}/messages` - Send message
- `/v1/chat` - Chat endpoint

### Option 2: Use Memeputer Commands (Webhook)
Since you've set up commands in Memeputer, you might need to:
1. Create a Memeputer command that generates blueprints/images
2. Call that command via webhook
3. Get the response

### Option 3: Check Memeputer API Documentation
The correct endpoint might be different. Check:
- Memeputer dashboard → API Documentation
- Or test with curl to find the correct endpoint

## Testing Memeputer API

### Test 1: List Agents
```bash
curl -X GET "https://developers.memeputer.com/v1/agents" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Test 2: Test Agent Chat
```bash
curl -X POST "https://developers.memeputer.com/v1/agents/YOUR_AGENT_ID/chat" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate a blueprint for GM template",
    "context": "crypto project"
  }'
```

### Test 3: Check Available Endpoints
```bash
curl -X OPTIONS "https://developers.memeputer.com/v1/agents/YOUR_AGENT_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

## Temporary Fix: Use Fallback Blueprints

Until we find the correct endpoint, the bot will use fallback blueprints (which is working based on your logs).

## Next Steps

1. Check Memeputer API documentation for correct endpoints
2. Test different endpoint paths
3. Consider using Memeputer's command system instead of direct API calls
4. Update the code once we find the correct endpoint

