#!/usr/bin/env python3
file_path = "/etc/nginx/sites-enabled/tomo-sa.com"

with open(file_path, "r") as f:
    lines = f.readlines()

# Find and replace in the server block listening on port 80
in_port_80_block = False
for i, line in enumerate(lines):
    if "listen 80;" in line or "listen [::]:80;" in line:
        in_port_80_block = True
    if in_port_80_block and "return 301 https://$server_name$request_uri;" in line:
        lines[i] = "    return 301 https://$host$request_uri;\n"
        print(f"Fixed line {i+1}")
        break
    if in_port_80_block and line.strip() == "}":
        break

with open(file_path, "w") as f:
    f.writelines(lines)

print("Done")
