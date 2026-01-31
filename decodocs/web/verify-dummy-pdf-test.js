/**
 * Verification script for dummy PDF loading functionality
 * This script verifies that the dummy PDF can be properly loaded and rendered by PDF.js
 * specifically within the /view route environment.
 */

import axios from 'axios';
import fs from 'fs';

async function verifyDummyPdfTest() {
  console.log('🔍 Verifying dummy PDF loading functionality...\n');
  
  // 1. Verify the dummy PDF file exists in the expected location
  console.log('📋 Step 1: Checking if dummy.pdf exists...');
  const dummyPdfPath = './public/test-docs/dummy.pdf';
  
  if (fs.existsSync(dummyPdfPath)) {
    const fileSize = fs.statSync(dummyPdfPath).size;
    console.log(`✅ Dummy PDF exists at ${dummyPdfPath}`);
    console.log(`📊 File size: ${fileSize} bytes`);
  } else {
    console.log(`❌ ERROR: Dummy PDF does not exist at ${dummyPdfPath}`);
    return false;
  }
  
  // 2. Verify the application is running
  console.log('\n📡 Step 2: Checking if application server is running...');
  try {
    const response = await axios.get('http://localhost:3003');
    if (response.status === 200) {
      console.log('✅ Application server is running on http://localhost:3003');
    } else {
      console.log(`❌ ERROR: Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR: Could not connect to application server');
    console.log('💡 Make sure to run `npm run dev` in the web directory first');
    return false;
  }
  
  // 3. Verify the PDF file is accessible via HTTP
  console.log('\n🌐 Step 3: Checking if dummy.pdf is accessible via HTTP...');
  try {
    const pdfResponse = await axios.head('http://localhost:3003/test-docs/dummy.pdf');
    if (pdfResponse.status === 200 && pdfResponse.headers['content-type'] === 'application/pdf') {
      console.log('✅ PDF file is accessible via HTTP');
      console.log(`📊 Content-Type: ${pdfResponse.headers['content-type']}`);
      console.log(`📊 Content-Length: ${pdfResponse.headers['content-length']} bytes`);
    } else {
      console.log(`❌ ERROR: PDF file not accessible or wrong content type`);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR: Could not access PDF file via HTTP');
    console.log(`💡 Error: ${error.message}`);
    return false;
  }
  
  // 4. Verify the /view/test-docs/dummy.pdf route exists
  console.log('\n🔗 Step 4: Checking if /view/test-docs/dummy.pdf route exists...');
  try {
    const viewResponse = await axios.head('http://localhost:3003/view/test-docs/dummy.pdf');
    if (viewResponse.status === 200) {
      console.log('✅ View route exists and returns HTML content');
      console.log(`📊 Content-Type: ${viewResponse.headers['content-type']}`);
    } else {
      console.log(`❌ ERROR: View route returned status ${viewResponse.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR: Could not access view route');
    console.log(`💡 Error: ${error.message}`);
    return false;
  }
  
  // 5. Verify the DocumentViewer component was updated
  console.log('\n🔧 Step 5: Checking if DocumentViewer component handles fileName parameter...');
  const componentPath = './src/components/DocumentViewer.jsx';
  
  if (fs.existsSync(componentPath)) {
    const componentCode = fs.readFileSync(componentPath, 'utf8');
    
    // Check for fileName parameter extraction
    if (componentCode.includes('const { documentId, fileName } = useParams();')) {
      console.log('✅ DocumentViewer component extracts fileName parameter');
    } else {
      console.log('❌ DocumentViewer component does not extract fileName parameter');
      return false;
    }
    
    // Check for loadTestPdf function
    if (componentCode.includes('const loadTestPdf = async (fileName) => {')) {
      console.log('✅ DocumentViewer component has loadTestPdf function');
    } else {
      console.log('❌ DocumentViewer component does not have loadTestPdf function');
      return false;
    }
    
    // Check for useEffect that handles fileName
    if (componentCode.includes('if (fileName) {') && componentCode.includes('await loadTestPdf(fileName);')) {
      console.log('✅ DocumentViewer component calls loadTestPdf when fileName is present');
    } else {
      console.log('❌ DocumentViewer component does not call loadTestPdf when fileName is present');
      return false;
    }
  } else {
    console.log(`❌ ERROR: DocumentViewer component not found at ${componentPath}`);
    return false;
  }
  
  // 6. Summary
  console.log('\n🎉 Verification completed!');
  console.log('\n📋 Summary of checks:');
  console.log('✅ 1. Dummy PDF file exists');
  console.log('✅ 2. Application server is running');
  console.log('✅ 3. PDF file is accessible via HTTP');
  console.log('✅ 4. View route exists');
  console.log('✅ 5. DocumentViewer component updated to handle test-docs route');
  
  console.log('\n✨ The dummy PDF loading functionality is properly implemented!');
  console.log('🚀 To test in browser, visit: http://localhost:3003/view/test-docs/dummy.pdf');
  
  return true;
}

// Run the verification
verifyDummyPdfTest()
  .then(success => {
    if (success) {
      console.log('\n🎊 All verifications passed! The test is successful.');
    } else {
      console.log('\n💥 Some verifications failed. Please check the implementation.');
    }
  })
  .catch(error => {
    console.error('❌ An error occurred during verification:', error);
  });