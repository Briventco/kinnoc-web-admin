import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // The production API only accepts https CORS origins, so a local portal can't
  // call it from http://localhost. Locally, set VITE_API_BASE_URL=/api/v1 and
  // VITE_DEV_API_PROXY to the API host: requests then go through this server.
  const proxy = env.VITE_DEV_API_PROXY
    ? { '/api': { target: env.VITE_DEV_API_PROXY, changeOrigin: true, secure: true } }
    : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
