---
name: playwright-e2e-testing
description: Write and execute end-to-end browser tests using Playwright. Trigger this skill when the user asks to add Playwright, write E2E tests, automate browser testing, or test full user flows.
---

# Playwright End-to-End Testing Skill

This skill guides agents in writing reliable, resilient End-to-End (E2E) tests using Playwright for web applications.

## 1. Setup & Installation
If Playwright is not installed, do so via:
```bash
npm install -D @playwright/test
npx playwright install chromium --with-deps
```
Configure `playwright.config.ts` to spin up the local dev server using `webServer: { command: 'npm run dev', url: 'http://localhost:3000' }`.

## 2. Writing Tests
- **Locators**: Prefer user-facing locators like `page.getByRole()`, `page.getByText()`, and `page.getByPlaceholder()`. Avoid CSS/XPath selectors as they are brittle.
- **Async/Await**: Ensure every action (e.g., `click()`, `fill()`) and assertion (`expect()`) is awaited.
- **Assertions**: Use Web-First Assertions (`toBeVisible()`, `toHaveText()`) instead of generic truthiness checks. Web-first assertions automatically wait and retry until the condition is met, eliminating the need for hardcoded timeouts (`page.waitForTimeout()`).

### Example Pattern:
```typescript
import { test, expect } from '@playwright/test';

test('User can submit search form', async ({ page }) => {
  await page.goto('/');
  const input = page.getByPlaceholder('Search...');
  await input.fill('Next.js');
  await input.press('Enter');
  
  await expect(page.getByRole('heading', { name: 'Results for Next.js' })).toBeVisible();
});
```

## 3. Handling Authentication
For apps requiring authentication (like Supabase or Firebase):
- **Mocking**: You can use `page.route()` to intercept network requests and return mocked JSON responses to simulate a logged-in state without actually hitting the database.
- **Storage State**: For real auth, log in once in a global setup script and save the auth state (cookies/local storage) via `page.context().storageState({ path: 'auth.json' })`. Then use this state across all tests via the `storageState` option in `playwright.config.ts`.

## 4. Execution & Debugging
- Run all tests: `npx playwright test`
- Run a specific file: `npx playwright test tests/example.spec.ts`
- Run in UI mode for interactive debugging (User must do this locally): `npx playwright test --ui`
- If tests fail in CI or headless mode, ensure `trace: 'on-first-retry'` is set in the config so a trace file is generated.

## 5. Strict Constraints
- **Never use `page.waitForTimeout()`**. Always rely on auto-retrying assertions.
- **Keep tests independent**. A test should not rely on the state mutated by a previous test.
