import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': `http://localhost:${process.env.TRIPO_PROXY_PORT || 8792}`,
      },
    },
  }
})
