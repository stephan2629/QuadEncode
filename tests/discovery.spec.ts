import { test, expect } from '@playwright/test';

test.describe('Discovery & Path Generation', () => {
  test('Search from homepage curates a path', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Ensure the page loaded and the search input is visible
    const searchInput = page.getByPlaceholder(/What do you want to learn\?/i);
    await expect(searchInput).toBeVisible();

    // Perform a search
    await searchInput.fill('Python Programming');
    await searchInput.press('Enter');

    // It should navigate to the study route
    await expect(page).toHaveURL(/\/study\/python-programming/);

    // Verify loading state or final state (the AI curation takes time, so we increase timeout)
    const curatingHeading = page.locator('h1:has-text("Curating path for")');
    await expect(curatingHeading).toBeVisible();
    
    // We don't wait for the full AI response in this basic test to save time,
    // but we verify the routing and UI state transitions correctly.
  });

  test('Public Landing Page features interactive demo', async ({ page }) => {
    await page.goto('/');

    // The 0ms instant-reveal flashcard widget (CLAUDE.md section 1) - verify
    // a real card renders and clicking it actually flips. Located by role
    // + visible text, not accessible name: FlipCardDemo's aria-label is a
    // fixed "Showing a prompt/answer..." string that overrides the
    // accessible-name computation, so the actual prompt text never appears
    // in it - name: matching against it would never find anything.
    // Asserting on aria-pressed rather than the answer text's visibility:
    // the card's front and back both stay in the DOM with a nonzero
    // bounding box at all times (only CSS backface-visibility hides the
    // unflipped face), which toBeVisible() doesn't account for - it would
    // pass even before a real flip. This section also animates in on
    // scroll (Framer Motion whileInView), hence the scroll first.
    // hasText only, not also matching on the aria-label-derived accessible
    // name: that label flips to "Showing the answer..." once clicked, and
    // a Locator re-queries on every assertion rather than holding a fixed
    // reference, so a name: filter tied to the pre-click label would stop
    // matching the very element the test just clicked.
    const card = page.getByRole('button').filter({ hasText: 'What is the relative minor of G major?' });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('aria-pressed', 'false');

    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });
});
