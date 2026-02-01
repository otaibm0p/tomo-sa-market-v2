#!/usr/bin/env python3
import re

file_path = "/var/www/tomo-app/backend/server.js"

with open(file_path, "r") as f:
    lines = f.readlines()

new_lines = []
found = False
skip_next = False

for i, line in enumerate(lines):
    # Skip duplicate/broken health endpoints
    if "app.get(/api/health" in line or "app.get('/api/health'" in line:
        skip_next = 2
        continue
    if skip_next > 0:
        skip_next -= 1
        continue
    
    # Find app.all('/api/*'
    if "app.all('/api/*'" in line or 'app.all("/api/*"' in line:
        if not found:
            # Insert health endpoint before this line
            new_lines.append("app.get('/api/health', (req, res) => {\n")
            new_lines.append("  res.status(200).json({ ok: true, status: 'healthy', ts: new Date().toISOString() });\n")
            new_lines.append("});\n")
            new_lines.append("\n")
            found = True
    
    new_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(new_lines)

print("Health endpoint fixed successfully")
