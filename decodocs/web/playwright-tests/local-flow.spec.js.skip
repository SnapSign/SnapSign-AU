import { test, expect } from '@playwright/test';

// Note: These tests assume you're running the app locally on port 3000
// To run: npm start in one terminal, then npx playwright test in another

test.describe('Local DecoDocs Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Using localhost for testing the actual functionality
    await page.goto('http://localhost:3000');
  });

  test('should display new homepage with correct content', async ({ page }) => {
    // Verify we're on the home page with new content
    await expect(page.locator('h1')).toContainText('Decode documents. Sign with clarity.');
    
    // Verify the main CTA button exists
    const openPdfButton = page.locator('button', { hasText: 'Open PDF Document' });
    await expect(openPdfButton).toBeVisible();
    
    // Verify secondary CTA exists
    const signPdfButton = page.locator('button', { hasText: 'Sign any PDF' });
    await expect(signPdfButton).toBeVisible();
    
    // Verify "How it works" section exists
    await expect(page.locator('h2', { hasText: 'How it works' })).toBeVisible();
    
    // Verify the 3 steps are visible
    await expect(page.locator('h3', { hasText: 'Open PDF' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Get explanation' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Decide / Sign' })).toBeVisible();
  });

  test('should have correct navigation elements', async ({ page }) => {
    // Check header
    await expect(page.locator('.nav-logo')).toContainText('DecoDocs');
    
    // Check navigation links
    await expect(page.locator('a', { hasText: 'Product' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Pricing' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Roadmap' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'About' })).toBeVisible();
    
    // Check main CTA button
    await expect(page.locator('button', { hasText: 'Open PDF' })).toBeVisible();
  });

  test('should display 6 feature cards', async ({ page }) => {
    // Check all 6 feature cards are visible
    await expect(page.locator('h3', { hasText: 'Plain-language explanation' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Caveats & unfair conditions' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Obligations & penalties summary' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Logical inconsistency flags' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Translation when needed' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Email-to-sign + HubSpot capture' })).toBeVisible();
  });

  test('should have proper header and footer', async ({ page }) => {
    // Check header
    await expect(page.locator('h1')).toContainText('DecoDocs');
    await expect(page.locator('p')).toContainText('Decode documents. Act with confidence.');
    
    // Check footer has updated content
    await expect(page.locator('footer p')).toContainText('SnapSign Pty Ltd');
    await expect(page.locator('footer p')).toContainText('ABN 72 679 570 757');
  });
});

// Additional tests for routing functionality
test.describe('Routing Tests', () => {
  test('should handle invalid routes gracefully', async ({ page }) => {
    // Test an invalid route
    await page.goto('http://localhost:3000/invalid-route');
    
    // Should still show the app structure
    await expect(page.locator('h1')).toContainText('DecoDocs');
  });
});

// Test the actual routing between components when running locally
test.describe('Component Navigation Tests', () => {
  test('should render different components based on route', async ({ page }) => {
    // Test home page
    await page.goto('http://localhost:3000/');
    await expect(page.locator('h1')).toContainText('Decode documents. Sign with clarity.');
    
    // The following tests would require actual routing simulation or mock data
    // which is difficult to test without a real document being uploaded
  });
});
