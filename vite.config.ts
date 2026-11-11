import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // pobb.in não envia CORS; o proxy deixa o navegador buscar /pobb/<id>/raw
  server: {
    proxy: {
      '/pobb': {
        target: 'https://pobb.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pobb/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/pobb': {
        target: 'https://pobb.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pobb/, ''),
      },
    },
  },
})
