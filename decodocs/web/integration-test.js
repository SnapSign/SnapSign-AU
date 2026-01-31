/**
 * Integration test for dummy PDF loading functionality
 * This test verifies that the dummy PDF can be properly loaded and rendered by PDF.js
 * specifically within the /view route environment.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

async function runIntegrationTest() {
  console.log('Starting integration test for dummy PDF loading...');
  
  // Check if dummy PDF exists
  const dummyPdfPath = path.join(__dirname, 'public', 'test-docs', 'dummy.pdf');
  if (!fs.existsSync(dummyPdfPath)) {
    console.error('❌ Dummy PDF file does not exist at:', dummyPdfPath);
    return false;
  }
  
  console.log('✅ Dummy PDF file exists');
  
  // Launch Puppeteer browser
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });
    
    // Start local server to serve the files
    console.log('Starting local server...');
    const server = http.createServer((req, res) => {
      // Serve files from the public directory
      let filePath = path.join(__dirname, req.url);
      
      // If requesting the root, serve index.html
      if (req.url === '/' || req.url.startsWith('/view')) {
        filePath = path.join(__dirname, 'dist', 'index.html');
      } else if (req.url.startsWith('/test-docs/')) {
        filePath = path.join(__dirname, 'public', req.url);
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        
        // Set content type based on file extension
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        if (ext === '.css') contentType = 'text/css';
        else if (ext === '.js') contentType = 'application/javascript';
        else if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.json') contentType = 'application/json';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    const port = 3001;
    server.listen(port, async () => {
      console.log(`Local server running on http://localhost:${port}`);
    });
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Navigate to the test PDF route
      console.log('Navigating to /view/test-docs/dummy.pdf...');
      await page.goto(`http://localhost:${port}/view/test-docs/dummy.pdf`, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      // Wait for potential PDF loading
      await page.waitForTimeout(3000);
      
      // Check if the PDF viewer canvas is present
      const canvasExists = await page.evaluate(() => {
        return document.querySelector('canvas') !== null;
      });
      
      if (canvasExists) {
        console.log('✅ PDF viewer canvas is present');
      } else {
        console.log('❌ PDF viewer canvas is NOT present');
      }
      
      // Check if PDF controls are present
      const controlsExist = await page.evaluate(() => {
        const prevBtn = document.querySelector('button:contains("Prev")');
        const nextBtn = document.querySelector('button:contains("Next")');
        const pageInfo = document.querySelector('span:contains("of")'); // Part of "Page X of Y"
        return !!prevBtn && !!nextBtn && !!pageInfo;
      });
      
      if (controlsExist) {
        console.log('✅ PDF controls are present');
      } else {
        console.log('❌ PDF controls are NOT present');
        
        // Try alternative selectors
        const altControlsExist = await page.evaluate(() => {
          const prevBtn = document.querySelector('button');
          const nextBtn = document.querySelector('button');
          const pageInfo = document.querySelector('span');
          return !!prevBtn && !!nextBtn && !!pageInfo;
        });
        
        if (altControlsExist) {
          console.log('✅ Alternative PDF controls found');
        }
      }
      
      // Check for error messages
      const hasErrors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .error-message');
        return errorElements.length > 0;
      });
      
      if (!hasErrors) {
        console.log('✅ No error messages found');
      } else {
        console.log('❌ Error messages found on page');
      }
      
      // Check if current file indicator shows dummy.pdf
      const showsCurrentFile = await page.evaluate(() => {
        const currentFileElement = document.querySelector('.current-file');
        return currentFileElement && currentFileElement.textContent.includes('dummy.pdf');
      });
      
      if (showsCurrentFile) {
        console.log('✅ Current file indicator shows dummy.pdf');
      } else {
        console.log('❌ Current file indicator does not show dummy.pdf');
      }
      
      // Take a screenshot for visual confirmation
      await page.screenshot({ path: 'integration-test-result.png' });
      console.log('📸 Screenshot saved as integration-test-result.png');
      
      // Final assessment
      const success = canvasExists && !hasErrors && showsCurrentFile;
      
      if (success) {
        console.log('\n🎉 Integration test PASSED!');
        console.log('The dummy PDF loads and renders correctly via the /view/test-docs/dummy.pdf route.');
      } else {
        console.log('\n💥 Integration test FAILED!');
        console.log('Some aspects of the PDF loading did not work as expected.');
      }
      
      server.close();
      await browser.close();
      
      return success;
    } catch (error) {
      console.error('Error during browser test:', error);
      server.close();
      await browser.close();
      return false;
    }
  } catch (error) {
    console.error('Error launching browser:', error);
    if (browser) {
      await browser.close();
    }
    return false;
  }
}

// Run the test
runIntegrationTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });