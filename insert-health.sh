#!/bin/bash
FILE="/var/www/tomo-app/backend/server.js"
LINE=87

# Read the file and insert before line 87
sed -i "${LINE}i\\
app.get('/api/health', (req, res) => {\\
  res.status(200).json({ ok: true, status: 'healthy', ts: new Date().toISOString() });\\
});\\
" "$FILE"

echo "Health endpoint added successfully"
