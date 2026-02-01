import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        // Local backend runs on 3000 in this project
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying for Socket.IO
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '→ http://localhost:3000');
          });
        },
      }
    },
    // Ensure all routes fallback to index.html for SPA routing
    historyApiFallback: true,
  },
  // Ensure build output is correct
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})

