import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // vite.config.js

    server: {
      proxy: {
        '/game': {
          target: 'ws://localhost:8080/',
          ws: true
        },
        '/api': {
          target: 'http://localhost:8080'
        }
      },
      fs: {
        allow: ['..']
      }
    }

})

