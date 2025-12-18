#!/bin/bash
# Check Memeputer API response without jq

echo "=== Testing Memeputer API ==="
echo ""

# Test 1: Chat endpoint
echo "Test 1: /v1/agents/{id}/chat"
RESPONSE=$(curl -s -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY"
echo ""

# If jq is available, pretty print
if command -v jq &> /dev/null; then
    echo "Pretty JSON:"
    echo "$BODY" | jq .
else
    echo "Install jq for pretty JSON: apt install jq"
fi

echo ""
echo "=== Testing Alternative Endpoints ==="

# Test 2: /messages
echo ""
echo "Test 2: /v1/agents/{id}/messages"
curl -s -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/messages" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate a sticker blueprint for GM template"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test 3: /generate
echo ""
echo "Test 3: /v1/agents/{id}/generate"
curl -s -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/generate" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "GM"}' \
  -w "\nHTTP Status: %{http_code}\n"

