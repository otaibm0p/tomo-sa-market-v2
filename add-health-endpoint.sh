#!/bin/bash
FILE="/var/www/tomo-app/backend/server.js"
LINE_NUM=$(grep -n "app.all('/api/\*'" "$FILE" | cut -d: -f1)

if [ -n "$LINE_NUM" ]; then
  # Create temporary file with the health endpoint
  cat > /tmp/health_endpoint.txt << 'ENDPOINT'
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, status: 'healthy', ts: new Date().toISOString() });
});

ENDPOINT
  
  # Insert before the line
  sed -i "${LINE_NUM}r /tmp/health_endpoint.txt" "$FILE"
  echo "✅ Health endpoint added before line $LINE_NUM"
  rm /tmp/health_endpoint.txt
else
  echo "❌ Pattern not found"
  exit 1
fi
