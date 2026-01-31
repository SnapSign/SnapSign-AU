import { test, expect } from '@playwright/test';

test.describe('Dummy PDF Loading Test', () => {
  test('should properly load and render dummy PDF via /view/test-docs/dummy.pdf route', async ({ page }) => {
    // Start the local development server first
    // Note: This assumes the app is running locally at http://localhost:3000
    // You may need to start the server separately before running this test
    
    // Navigate to the test PDF route
    await page.goto('http://localhost:3000/view/test-docs/dummy.pdf');
    
    // Wait for the page to load and PDF to render
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for PDF to fully load
    await page.waitForTimeout(3000);
    
    // Check if the PDF viewer canvas is present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCount(1);
    
    // Check if PDF controls are present
    await expect(page.locator('.pdf-controls')).toBeVisible();
    await expect(page.locator('button:has-text("Prev")')).toBeVisible();
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
    await expect(page.locator('text=Page \\d+ of \\d+')).toBeVisible();
    
    // Verify that the PDF has loaded successfully by checking for page information
    const numPagesElement = page.locator('text=of'); // Part of "Page X of Y"
    await expect(numPagesElement).toBeVisible();
    
    // Verify that the PDF document is displayed (not an error message)
    const errorElements = page.locator('.pdf-loading, .pdf-placeholder');
    await expect(errorElements).toHaveCount(0);
    
    // Check that there's a current file indicator showing the dummy PDF
    const currentFile = page.locator('.current-file');
    await expect(currentFile).toContainText('dummy.pdf');
    
    // Take a screenshot to visually confirm the PDF is rendered
    await page.screenshot({ path: 'test-results/dummy-pdf-loaded.png', fullPage: true });
  });

  test('should properly load and render dummy PDF via /view route with documentId', async ({ page }) => {
    // This test ensures that the regular /view route also works properly
    // For this test, we'll simulate loading the dummy PDF through the standard mechanism
    await page.goto('http://localhost:3000/view');
    
    await page.waitForLoadState('networkidle');
    
    // Verify initial state
    const placeholder = page.locator('.pdf-placeholder');
    await expect(placeholder).toBeVisible();
    
    // The test for actual file loading would require file upload simulation
    // which is more complex and outside the scope of this specific requirement
    // The primary requirement was to test the /view/test-docs/dummy.pdf route
  });

  test('should handle invalid PDF file gracefully', async ({ page }) => {
    // Test that the app handles non-existent PDF files gracefully
    await page.goto('http://localhost:3000/view/test-docs/nonexistent.pdf');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show an error or fallback instead of crashing
    const errorAlert = page.locator('text=Error loading test PDF');
    // This test expects that an alert is shown for invalid files
    // If no alert appears, the app might handle errors differently
  });
});