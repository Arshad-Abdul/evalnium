import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true, // Listens on 0.0.0.0 (all network interfaces, e.g. 10.24.65.78)
    port: 5175,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      }
    }
  }
})
