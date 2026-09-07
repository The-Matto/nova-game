import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Dev proxy target - defaults to the local backend. Point it at a remote one instead (e.g.
  // the deployed Railway server) by setting VITE_DEV_API_TARGET in a gitignored .env.local,
  // without needing that backend/its DB tunnel running locally.
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8080';
  const wsTarget = apiTarget.replace(/^http/, 'ws');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/game': {
          target: `${wsTarget}/`,
          ws: true
        },
        '/api': {
          target: apiTarget,
          //Without this, the proxy forwards the original Host: localhost header to the
          //target - harmless against a plain local HTTP backend, but breaks TLS/SNI once
          //the target is a real HTTPS host (the cert won't match "localhost").
          changeOrigin: true
        }
      },
      fs: {
        allow: ['..']
      }
    }
  }
})
