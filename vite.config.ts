import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        timeout: 0,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        timeout: 0,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: [
      'react-big-calendar',
      'react-big-calendar/lib/addons/dragAndDrop',
      'date-fns/format',
      'date-fns/parse',
      'date-fns/startOfWeek',
      'date-fns/getDay',
      'date-fns/locale/en-US'
    ]
  }
}) 