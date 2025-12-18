# Test Memeputer API Endpoints

Run these commands on your VM to test Memeputer API and find the correct endpoints.

## Get Your Environment Variables

```bash
cd /srv/PackPuter
source bot/.env 2>/dev/null || cat bot/.env | grep MEMEPUTER
```

## Test 1: List Agents

```bash
curl -X GET "https://developers.memeputer.com/v1/agents" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" | jq .
```

## Test 2: Test Agent Chat Endpoint

```bash
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate a sticker blueprint for GM template"
  }' | jq .
```

## Test 3: Check Available Endpoints (OPTIONS)

```bash
curl -X OPTIONS "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -v
```

## Test 4: Try Different Endpoint Paths

```bash
# Try /v1/agents/{id}/generate
curl -X POST "https://developers.memeputer.com/v1/agents/0959084c-7e28-4365-8c61-7d94559e3834/generate" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "GM"}' | jq .

# Try /v1/chat
curl -X POST "https://developers.memeputer.com/v1/chat" \
  -H "x-api-key: _9qQL2ZEHHeEMnOi0f7G6m9wR7ooBGS5w45rAALDWj8" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "0959084c-7e28-4365-8c61-7d94559e3834",
    "message": "Generate blueprint for GM"
  }' | jq .
```

## Find Your Service URL

### Get VM Public IP
```bash
# On your VM
curl -s ifconfig.me
# OR
hostname -I | awk '{print $1}'
```

### Check Exposed Ports
```bash
cd /srv/PackPuter
docker-compose ps
# Check what ports are mapped
```

### Test Service Accessibility
```bash
# From VM
curl http://localhost:8000/health

# From outside (replace YOUR_VM_IP)
curl http://YOUR_VM_IP:8000/health
```

### Your Service URL for Memeputer
Based on your docker-compose.yml, your worker is on port 8000.

**Service URL format:**
```
http://YOUR_VM_IP:8000
```

**For Memeputer webhooks:**
```
http://YOUR_VM_IP:8000/api/commands/{command_name}
```

**Note:** You'll need to expose port 8000 or set up a reverse proxy (nginx) on port 80/443.

