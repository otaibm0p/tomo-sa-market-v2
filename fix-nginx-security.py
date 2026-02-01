#!/usr/bin/env python3
import re

# Fix server_tokens
nginx_conf = "/etc/nginx/nginx.conf"
with open(nginx_conf, "r") as f:
    content = f.read()

# Uncomment server_tokens if commented
content = re.sub(r'^\s*#\s*server_tokens\s+off;', '    server_tokens off;', content, flags=re.MULTILINE)

# Or add it if not present
if "server_tokens" not in content:
    content = re.sub(r'(http\s*\{)', r'\1\n    server_tokens off;', content)

with open(nginx_conf, "w") as f:
    f.write(content)

print("server_tokens fixed")

# Fix HSTS - remove preload and set max-age=86400
site_conf = "/etc/nginx/sites-enabled/tomo-sa.com"
with open(site_conf, "r") as f:
    content = f.read()

# Replace HSTS header
content = re.sub(
    r'add_header\s+Strict-Transport-Security\s+"[^"]*"',
    'add_header Strict-Transport-Security "max-age=86400; includeSubDomains"',
    content
)

with open(site_conf, "w") as f:
    f.write(content)

print("HSTS fixed")
