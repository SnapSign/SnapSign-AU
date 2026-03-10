const fs = require('fs');
let text = fs.readFileSync('Decodocs/web/playwright-tests/docx-rendering.spec.js', 'utf8');
text = text.replace(
  "await expect(page.locator('.docx-viewer-container')).toBeVisible({ timeout: 30000 });",
  "await page.screenshot({ path: 'docx-error.png' });\n    await expect(page.locator('.docx-viewer-container')).toBeVisible({ timeout: 10000 });"
);
fs.writeFileSync('Decodocs/web/playwright-tests/docx-rendering.spec.js', text);
