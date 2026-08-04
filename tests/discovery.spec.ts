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
    
    // Look for the FlipCardDemo
    const submitButton = page.locator('text="Submit"');
    await expect(submitButton).toBeVisible();
    
    // Test the mock app window presence
    const mockApp = page.locator('text="Quad Encode - Study Session"');
    await expect(mockApp).toBeVisible();
  });
});
