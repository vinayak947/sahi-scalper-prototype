import { defineConfig } from 'vite'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  base: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/` : '/',
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8444'),
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8444'),
  },
})
