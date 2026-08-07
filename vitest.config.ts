import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'node:path';

// Vitest doesn't put .env.local into process.env on its own, and Vite's own
// import.meta.env only exposes VITE_-prefixed keys. The RLS test
// (src/lib/notes-rls.test.ts) needs the real Supabase URL + keys, so load
// every key ('' prefix = no filtering) into process.env here. loadEnv comes
// from Vite, already a dependency - no dotenv needed. Nothing secret is
// exposed to a bundle by this; it only affects the test process.
const env = loadEnv('test', process.cwd(), '');
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}

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
