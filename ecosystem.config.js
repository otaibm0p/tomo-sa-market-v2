// PM2 Ecosystem Configuration
// Place this file at: /var/www/tomo-market/ecosystem.config.js

module.exports = {
  apps: [{
    name: 'tomo-market-backend',
    script: './backend/server.js',
    cwd: '/var/www/tomo-market',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/tomo-backend-error.log',
    out_file: '/var/log/pm2/tomo-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};

