import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          // Validation is shared by the stores and shell; keep it out of the
          // entry chunk so the first paint stays under the asset budget.
          if (id.includes('node_modules/zod')) return 'validation';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.MIND_API_ORIGIN ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
