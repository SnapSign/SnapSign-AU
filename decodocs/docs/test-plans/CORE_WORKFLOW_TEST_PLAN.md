# Core Document Workflow Test Plan

IMPORTANT: when run playwrite do it with report list key, like:  npx playwright test --reporter=list

## 1. Overview
This test plan focuses on the central value proposition of DecoDocs: **Document Ingestion → AI Analysis → Results Visualization**. It breaks down the workflow into granular, observable UI states and user interactions available in the production environment.

**Scope:**
- PDF Upload/Opening via `DocumentViewer`.
- Analysis Triggering via Toolbox buttons.
- Result Presentation (Badges, Panels, Text).
- Authentication State enforcement.

---

## 2. Test Environment
- **URL**: `https://decodocs-site.web.app` (Production)
- **Test Users**:
  - `Guest` (Unauthenticated / Anonymous)
  - `Pro User` (Authenticated with subscription)
- **Test Data**:
  - `clean_contract.pdf` (Simple, low risk)
  - `risky_contract.pdf` (Complex, multiple risk clauses)

---

## 3. Detailed Test Scenarios

### 3.1 Document Ingestion (Prerequisite)

| ID | Feature / Component | Action / State | Expected Observable Result | Pass/Fail |
|----|---------------------|----------------|----------------------------|-----------|
| **ING-01** | **Initial State** | Navigate to `/view`. | `div.pdf-placeholder` is visible containing text: *"No PDF selected. Click 'Open PDF' to load a document."* | |
| **ING-02** | **File Selection** | Click `button.open-pdf-btn` ("Open Different PDF"). | System file picker dialog opens. | |
| **ING-03** | **Loading State** | Select a valid PDF file. | `div.pdf-loading` visible text: *"Loading PDF..."* initiates immediately. | |
| **ING-04** | **Render Success** | Wait for load completion. | `canvas` element inside `div.pdf-display` is visible and has height > 0. Placeholder and Loading divs are hidden. | |
| **ING-05** | **File Name Display** | Check header controls. | `span.current-file` displays the exact filename of the uploaded PDF. | |
| **ING-06** | **Zoom Controls** | Click "Zoom In" button in `div.pdf-zoom`. | `span` text updates (e.g., "150%"). `canvas` width/height attributes increase. | |
| **ING-07** | **Pagination** | Load multi-page PDF. Click "Next ›". | "Page X of Y" updates. `canvas` re-renders (brief flickr or content change). | |

---

### 3.2 feature: Toolbox & Analysis Triggering

*Pre-condition: Document loaded (ING-04 passed).*

| ID | Feature / Component | Action / State | Expected Observable Result | Pass/Fail |
|----|---------------------|----------------|----------------------------|-----------|
| **BTN-01** | **Auth Enforcement** | **As Guest**: Observe Toolbox buttons. | All buttons in `div.toolbox-buttons` are **DISABLED**. | |
| **BTN-02** | **Auth Enablement** | **As Authenticated User**: Observe Toolbox buttons. | "Analyze Document", "Highlight Risks", etc. are **ENABLED**. | |
| **ANL-01** | **Analyze Trigger** | Click **"Analyze Document"**. | Button text changes to *"Analyzing..."*. Button becomes disabled. | |
| **ANL-02** | **Analysis Completion** | Wait for API response (~5s). | Button text reverts to "Analyze Document". `div.analysis-results` panel appears in the DOM. | |

---

### 3.3 Feature: Results Visualization

*Pre-condition: Analysis completed (ANL-02 passed).*

| ID | Feature / Component | Action / State | Expected Observable Result | Pass/Fail |
|----|---------------------|----------------|----------------------------|-----------|
| **RES-01** | **Analysis Panel** | Check `div.analysis-results`. | Header `h4` *"Analysis Results"* is visible. | |
| **RES-02** | **Summary Section** | Check `div.summary-section`. | Contains `h5` *"Document Summary"* and a non-empty `p` tag. | |
| **RES-03** | **Risk List** | Check `div.risks-section`. | Contains at least one `div.risk-item`. | |
| **RES-04** | **Risk Item UI** | Inspect a `div.risk-item`. | Has `span.risk-level` (e.g., "HIGH"). Border color matches badge color (Red/Orange/Yellow). | |
| **RES-05** | **Recommendations** | Check `div.recommendations-section`. | Contains `ul` with at least one `li.recommendation-item`. | |

---

### 3.4 Feature: Canvas Annotations (Visual Overlay)

*Pre-condition: Analysis completed (ANL-02 passed).*

| ID | Feature / Component | Action / State | Expected Observable Result | Pass/Fail |
|----|---------------------|----------------|----------------------------|-----------|
| **OVL-01** | **Risk Badges** | Inspect `div` container `annotationsRef`. | Contains children with class `risk-badge`. Text content matches levels (e.g., "HIGH"). | |
| **OVL-02** | **Badge Interaction** | Click a `div.risk-badge`. | Browser `alert()` opens with Risk Description and Explanation. | |
| **OVL-03** | **Highlights** | Check for text highlights. | `div.highlight-overlay` elements exist with `backgroundColor` (yellowish rgba). | |

---

### 3.5 Feature: Specific Tools

*Pre-condition: Authenticated User, Document Loaded.*

| ID | Feature / Component | Action / State | Expected Observable Result | Pass/Fail |
|----|---------------------|----------------|----------------------------|-----------|
| **TOOL-01**| **Plain English** | Click "Translate to Plain English". | Browser `alert()` appears containing: *"Original: ... Plain English: ..."*. | |
| **TOOL-02**| **Highlight Risks** | Click "Highlight Risks" button. | (If risks found) Browser `alert()` appears: *"Found X risks..."*. New badges render on canvas. | |
| **TOOL-03**| **Explain Section** | Select text (if possible) -> Click "Explain Selection". | Browser `alert()` with explanation. | |

---

## 4. Automation Strategy (Playwright)

To convert this plan into code, we will implement `core-workflow.spec.js`:

1.  **Mocking (Stage 1)**: Verify UI states transition correctly (Loading -> Success) using mocked API responses.
2.  **Integration (Stage 2)**:
    *   Use `page.setInputFiles` to upload a real dummy PDF.
    *   Wait for `canvas` element to ensure PDF.js rendered.
    *   Intercept network requests to `cloudfunctions.net` to verify call payload.
    *   Verify response UI text contains "Summary" or "Risk".

## 5. Manual Smoke Test Checklist
*Run before every deployment.*

- [ ] Open PDF from local disk.
- [ ] Render verify (can read text).
- [ ] Click "Analyze Document" -> Wait for result.
- [ ] Check text explanation makes sense (sanity check).
- [ ] Refresh page -> App reloads cleanly.
