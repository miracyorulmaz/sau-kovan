import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Argon Frontend Proxy Configuration
// Ensure the backend CORS origin list includes 'http://localhost:5173' (never '*')
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/events': {
          target: backendTarget.replace(/^http/, 'ws'),
          ws: true,
          changeOrigin: false
        },
        '/api': {
          target: backendTarget,
          changeOrigin: false
        }
      }
    }
  };
});
