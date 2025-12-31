import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Default to jsdom for React components
    environmentMatchGlobs: [
      // Use jsdom for React component tests
      ['**/*.test.tsx', 'jsdom'],
      // Use node for pure TypeScript tests
      ['**/*.test.ts', 'node'],
    ],
    setupFiles: ['./src/test/setup.ts'], // Optional: setup file for test utilities
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

