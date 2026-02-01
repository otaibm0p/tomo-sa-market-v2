# Commands to Run Drivers Migration Fix

## Current Issues on Server

1. **Missing `pg` module**: The script tried to use `pg` but it's not in the current environment
2. **PostgreSQL authentication**: Wrong user or auth method

## Correct Ways to Run Migration

### Method 1: Use migrate.js (Already works in server.js)
```bash
cd /var/www/tomo-market/backend
./node_modules/.bin/node migrate.js
```

### Method 2: Use npm scripts
```bash
cd /var/www/tomo-market/backend
node -r fs server.js  # This will trigger the built-in migration\n```

### Method 3: Use psql with correct user
```bash
cd /var/www/tomo-market/backend
# Find which user/server is actually running
sudo -u postgres psql -d tomo_db

# Inside psql, run:
\i migrations/0007_fix_drivers_foreign_key.sql
\q
```

### Method 4: Check environment first
```bash
cd /var/www/tomo-market/backend
echo \"DATABASE_URL: $DATABASE_URL\"  # Check environment\n# Use the same connection as server.js uses\n```
\n## Immediate fix - try these:\n\nMake sure you're in the right directory with all dependencies:\n\n```bash\n# SSH to server\nssh root@138.68.245.29\n\n# Check current environment\npwd\nls -la node_modules/ | grep pg\n\ncd /var/www/tomo-market/backend\n\n# Option 1: Use the working migration system\n./node_modules/.bin/node migrate.js\n\n# Option 2: Direct Node with pg module in path\nNODE_PATH="./node_modules" node migrations/0007_fix_drivers_foreign_key.sql\n\n# Option 3: Run as part of server startup\nNODE_ENV=production node server.js  # This runs all migrations automatically\n```\n\n### If still having issues with authentication:\n\n```bash\ncd /var/www/tomo-market/backend\n# Check what user/database is actually being used\ngrep -n \"DATABASE_URL\\|pool query\" server.js | head -5\\n\\n# Use the production database connection\\nsudo -u postgres psql -d tomo_db -c \\\"SELECT version();\\\"\n\\nsudo -u postgres psql -d tomo_db -f migrations/0007_fix_drivers_foreign_key.sql\n```\n\n### Final Solution: Use the Server's Own Migration System\nSince server.js already has migrations working, the best approach is:\n\n```bash\n# This will run ALL pending migrations, including ours\ncd /var/www/tomo-market/backend\nnode server.js\n# Or better yet, restart the server which will run migrations:\npm2 restart tomo-market-backend\n```\n\n## Success Check\n\nAfter running successfully, you should see:\n```\n✅ PRIMARY KEY: PRIMARY KEY (user_id)\n✅ FOREIGN KEY: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n✅ Migration completed successfully!\n```\n\nLet me know if you get any specific error messages.\n