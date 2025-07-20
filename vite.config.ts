import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // vite.config.js

    server: {
      proxy: {
        '/game': {
          target: 'ws://localhost:8080/',
          ws: true
        }
      }
    }

})

