import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function apiPreconnectPlugin(apiUrl: string | undefined): Plugin {
  return {
    name: 'brew-boba-api-preconnect',
    transformIndexHtml() {
      const cleaned = apiUrl?.trim().replace(/^["']|["']$/g, '');
      if (!cleaned) return [];
      try {
        const parsed = new URL(cleaned);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
          return [];
        }
        return [
          {
            tag: 'link',
            attrs: { rel: 'preconnect', href: parsed.origin, crossorigin: true },
            injectTo: 'head',
          },
          {
            tag: 'link',
            attrs: { rel: 'dns-prefetch', href: parsed.origin },
            injectTo: 'head',
          },
        ];
      } catch {
        return [];
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), 'VITE_');

  return {
    plugins: [react(), tailwindcss(), apiPreconnectPlugin(env.VITE_API_URL)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    preview: {
      host: '0.0.0.0',
      // v0 uses changing sandbox hostnames; limit access to its preview domains.
      // Do not replace with allowedHosts: true.
      allowedHosts: ['.v0.build', '.vercel.run'],
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['.v0.build', '.vercel.run'],
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: process.env.VITE_PROXY_TARGET || 'http://localhost:8003',
          changeOrigin: true,
        },
      },
    },
  };
});
