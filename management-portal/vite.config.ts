import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react(), tailwindcss()],
    preview: {
      host: '0.0.0.0',
      // v0 uses changing sandbox hostnames; limit access to its preview domains.
      // Do not replace with allowedHosts: true.
      allowedHosts: ['.v0.build', '.vercel.run'],
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['.v0.build', '.vercel.run'],
      port: 5175,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8001',
          changeOrigin: true,
        },
      },
    },
  }
})
