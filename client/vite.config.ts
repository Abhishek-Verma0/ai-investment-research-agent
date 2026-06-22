import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const dir = path.dirname(fileURLToPath(import.meta.url));

// In dev the client runs on :5173 and proxies /api to the Node server, so the
// browser sees a single origin (same as the unified production deploy). We read
// PORT from the ROOT .env so the proxy always points at the right server port
// (e.g. if you set PORT=8801, the proxy follows automatically).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(dir, '..'), '');
  const serverPort = env.PORT || '8787';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
    build: { outDir: 'dist' },
  };
});
