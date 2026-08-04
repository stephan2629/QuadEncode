import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    // tests/ holds Playwright e2e specs (its own testDir, see
    // playwright.config.ts) - vitest's default include pattern matches any
    // *.spec.ts and would otherwise try to run them too.
    exclude: ['**/node_modules/**', 'tests/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
