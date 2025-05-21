import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    cors: true,
    hmr: { clientPort: 443 },
    proxy: {
      '/api': {
        target: 'https://testing-agent-app-pkru6.ondigitalocean.app',
        changeOrigin: true,
        secure: true
      }
    },
    fs: { strict: true },
    origin: 'https://testing-agent-eight.vercel.app',
    allowedHosts: ['testing-agent-eight.vercel.app']
  },
  build: { outDir: "dist" },
  preview: { host: '0.0.0.0' }
});