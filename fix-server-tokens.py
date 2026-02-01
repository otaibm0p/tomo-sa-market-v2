#!/usr/bin/env python3
import re

nginx_conf = "/etc/nginx/nginx.conf"
with open(nginx_conf, "r") as f:
    content = f.read()

# Uncomment server_tokens if commented
content = re.sub(r'^\s*#\s*server_tokens\s+off;', '    server_tokens off;', content, flags=re.MULTILINE)

# Or add it if not present (check if it's not active)
if not re.search(r'^\s+server_tokens\s+off;', content, re.MULTILINE):
    content = re.sub(r'(http\s*\{)', r'\1\n    server_tokens off;', content)

with open(nginx_conf, "w") as f:
    f.write(content)

print("server_tokens off configured")
