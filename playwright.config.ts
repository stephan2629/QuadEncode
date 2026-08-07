import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

// `npm run dev` picks up .env.local on its own, but the test process does
// not - and tests/notes-editor.spec.ts needs the Supabase keys itself to
// create and delete its throwaway user. Same loadEnv approach as
// vitest.config.ts; '' means "every key, no prefix filter". In CI these
// come from the workflow's env block instead (see .github/workflows/ci.yml).
const env = loadEnv('test', process.cwd(), '');
for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
