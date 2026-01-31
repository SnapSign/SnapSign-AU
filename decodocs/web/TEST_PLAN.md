# Test Plan: Dummy PDF Loading via /view Route

## Objective
Verify that the dummy PDF from the repository can be properly loaded and rendered by PDF.js specifically within the /view route environment.

## Test Cases

### 1. Unit Test - Component Logic Verification
- Verify that the DocumentViewer component properly handles the `fileName` parameter from the route
- Verify that the `loadTestPdf` function is called when accessing `/view/test-docs/dummy.pdf`
- Verify that the PDF is fetched from the correct URL: `/test-docs/dummy.pdf`
- Verify that the PDF document is properly processed by PDF.js

### 2. Integration Test - End-to-End Flow
- Start the development server
- Navigate to `/view/test-docs/dummy.pdf`
- Verify that the PDF renders correctly
- Verify that PDF controls are functional
- Verify that no errors occur during loading

### 3. Manual Verification
- Manually test the route in a browser
- Confirm that the dummy PDF displays properly
- Test navigation between pages if applicable
- Verify zoom functionality

## Implementation Details

### Updated DocumentViewer.jsx
- Modified `useParams` to extract both `documentId` and `fileName`
- Added `loadTestPdf` function to handle loading PDFs from the public/test-docs directory
- Updated useEffect to call `loadTestPdf` when `fileName` is present
- Updated the location state useEffect to only run when not loading a test PDF

### Test Files Created
1. `src/__tests__/DocumentViewer-PDF-Test.test.jsx` - Unit tests for the PDF loading functionality
2. `playwright-tests/test-dummy-pdf.spec.js` - E2E tests using Playwright
3. `integration-test.js` - Standalone integration test

## Expected Behavior
When navigating to `/view/test-docs/dummy.pdf`, the application should:
1. Detect the `fileName` parameter in the route
2. Fetch the PDF from `/test-docs/dummy.pdf`
3. Process the PDF using PDF.js
4. Render the PDF in the viewer canvas
5. Display PDF controls (navigation, zoom, etc.)
6. Show the filename in the current file indicator

## Success Criteria
- The dummy PDF loads without errors
- The PDF renders correctly in the viewer
- All PDF controls are functional
- No error messages are displayed
- The current file indicator shows "dummy.pdf"