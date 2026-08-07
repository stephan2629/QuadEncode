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

  test('A certification returns three ordered steps and no retry', async ({ page }) => {
    // "CompTIA Security+" slugifies to this, and it is one of the three
    // pinned paths (src/lib/certPaths.ts), so it renders without the Serper
    // or YouTube keys CI does not have.
    await page.goto('/study/comptia-security');

    const headings = page.getByTestId('step-heading');
    await expect(headings.first()).toBeVisible();
    await expect(headings).toHaveText([
      'Overview of the exam, official site',
      'Training course',
      'Exam prep material',
    ]);

    // One training course card holding both versions, free selected first.
    // Picking Paid swaps the card to the Udemy course in place.
    const free = page.getByRole('button', { name: 'Free', exact: true });
    const paid = page.getByRole('button', { name: 'Paid', exact: true });
    await expect(free).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('a[href*="youtube.com/playlist"]')).toHaveCount(1);
    await expect(page.locator('a[href*="udemy.com"]')).toHaveCount(0);

    await paid.click();
    await expect(paid).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('a[href*="udemy.com"]')).toHaveCount(1);
    await expect(page.locator('a[href*="youtube.com/playlist"]')).toHaveCount(0);

    // Deterministic path, so there is nothing to retry into.
    await expect(page.getByRole('button', { name: /Try a different path/i })).toHaveCount(0);
  });

  test('Saving a path saves the course version the user picked', async ({ page }) => {
    await page.goto('/study/comptia-security');

    // Signed out, Save path stashes the exact payload it would have sent and
    // sends the visitor to sign in, which makes the payload readable here.
    await page.getByRole('button', { name: 'Paid' }).click();
    await page.getByRole('button', { name: /Save path/i }).click();
    await expect(page).toHaveURL(/\/login/);

    const saved = await page.evaluate(() => sessionStorage.getItem('pendingPathSave'));
    const urls = JSON.parse(saved!).resources.map((r: { url: string }) => r.url);
    expect(urls.some((u: string) => u.includes('udemy.com'))).toBe(true);
    expect(urls.some((u: string) => u.includes('youtube.com'))).toBe(false);
  });

  test('A skill keeps the flat path and its retry button', async ({ page }) => {
    // Unlike the certification above, this one runs the real pipeline.
    test.skip(!process.env.SERPER_API_KEY, 'Needs the live search keys');
    test.setTimeout(120_000);

    await page.goto('/study/spanish-vocabulary');
    await expect(page.getByRole('button', { name: /Try a different path/i })).toBeVisible({
      timeout: 90_000,
    });
    // No step headings: a subject stays a flat list.
    await expect(page.getByTestId('step-heading')).toHaveCount(0);
  });

  test('Landing page offers both routes, not just search', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Find a path' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Just start studying' })).toBeVisible();
    // Scoped to main: the footer carries an "Open a note" link too.
    await expect(page.getByRole('main').getByRole('link', { name: /Open a note/i })).toBeVisible();

    // The footer is public-surface only, and every link in it has to point at
    // a route that exists.
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    await expect(footer.getByRole('link', { name: 'CompTIA Security+' })).toHaveAttribute(
      'href',
      '/study/comptia-security'
    );
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
