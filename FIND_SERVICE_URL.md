# How to Find Your Service URL

## Finding Your VM's Public IP and Service URL

### Step 1: Get Your VM's Public IP Address

**On your VM, run:**
```bash
# Get public IP
curl -s ifconfig.me
# OR
curl -s ipinfo.io/ip
# OR
hostname -I | awk '{print $1}'
```

**Or check your cloud provider dashboard:**
- AWS: EC2 Dashboard → Instances → Your instance → Public IPv4 address
- DigitalOcean: Droplets → Your droplet → IPv4
- Hetzner: Servers → Your server → IP addresses

### Step 2: Check What Ports Are Exposed

**Check Docker Compose ports:**
```bash
cd /srv/PackPuter
cat docker-compose.yml | grep -A 5 "ports:"
```

**Check if port 8080 is exposed:**
```bash
# Check if port 8080 is listening
sudo netstat -tlnp | grep 8080
# OR
sudo ss -tlnp | grep 8080
```

### Step 3: Check Firewall/Security Group

**On your VM:**
```bash
# Check UFW (Ubuntu firewall)
sudo ufw status

# Check if port 8080 is allowed
sudo ufw allow 8080/tcp
```

**In your cloud provider:**
- AWS: Security Groups → Inbound rules → Add port 8080
- DigitalOcean: Firewall → Add rule for port 8080
- Hetzner: Firewall → Add rule for port 8080

### Step 4: Test Your Service URL

**From your local machine:**
```bash
# Replace YOUR_VM_IP with your actual IP
curl -v http://YOUR_VM_IP:8080
# OR if using HTTPS
curl -v https://YOUR_VM_IP:8080
```

**From your VM:**
```bash
# Test localhost
curl http://localhost:8080

# Test from inside Docker network
docker-compose exec bot curl http://worker:8000/health
```

### Step 5: Set Up Domain/HTTPS (Optional)

If you want a domain name:
1. Point your domain's A record to your VM's IP
2. Set up nginx/caddy as reverse proxy
3. Configure SSL certificate (Let's Encrypt)

**Example nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Quick Commands to Find Service Info

### Get All Network Info
```bash
# On your VM
echo "=== Public IP ==="
curl -s ifconfig.me
echo ""
echo "=== Local IP ==="
hostname -I
echo ""
echo "=== Docker Ports ==="
docker-compose ps
echo ""
echo "=== Listening Ports ==="
sudo netstat -tlnp | grep -E "(8080|8000|3000)"
```

### Test Service Accessibility
```bash
# Test from VM
curl -v http://localhost:8080

# Test worker service
curl -v http://localhost:8000/health

# Test from outside (replace with your IP)
curl -v http://YOUR_VM_IP:8080
```

## For Memeputer Webhooks

Your service URL for Memeputer commands should be:
```
http://YOUR_VM_IP:8080/api/commands/{command_name}
```

Or if you set up a domain:
```
https://your-domain.com/api/commands/{command_name}
```

## Common Issues

### Port Not Accessible
- Check firewall rules
- Check security group settings
- Verify port is exposed in docker-compose.yml

### Connection Refused
- Service might not be running
- Port might not be listening
- Firewall blocking connection

### SSL/HTTPS Issues
- Use nginx/caddy as reverse proxy
- Set up Let's Encrypt certificate
- Or use HTTP for testing (not recommended for production)

