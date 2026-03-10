const fs = require('fs');
let code = fs.readFileSync('Decodocs/web/playwright-tests/docx-rendering.spec.js', 'utf8');
code = code.replace("test('should render DOCX properly using docx-preview', async ({ page }) => {", "test('should render DOCX properly using docx-preview', async ({ page }) => {\n    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));\n    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));");
fs.writeFileSync('Decodocs/web/playwright-tests/docx-rendering.spec.js', code);
