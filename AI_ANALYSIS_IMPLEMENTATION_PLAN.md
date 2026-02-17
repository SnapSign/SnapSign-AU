# DecoDocs AI Analysis Implementation Plan

**Date:** February 16, 2026  
**Status:** In Progress - Backend Implemented, Integration/Docs Alignment Needed

---

## Executive Summary

The DecoDocs web app has **implemented backend AI callables**, but integration and documentation drift remains. The frontend hooks and components are in place, but some handlers still assume outdated response shapes and several docs still describe the pre-implementation state. This plan outlines how to close those gaps.

---

## Current State Analysis

### ✅ What's Complete

1. **Frontend Architecture**
   - ✅ React components for analysis (AnalysisToolbox, AnalysisSidebar)
   - ✅ Hooks structure (useDocumentAnalysis, useDocumentTypeDetection)
   - ✅ PDF text extraction and processing
   - ✅ UI/UX for analysis tools

2. **Backend Scaffolding**
   - ✅ Firebase Cloud Functions setup (gen2)
   - ✅ Token budget system (usage tracking)
   - ✅ Entitlement system (Free vs Pro)
   - ✅ Document hashing and ledger
   - ✅ Auth context and permissions

3. **Service Layer**
   - ✅ Firebase callable functions wrapper
   - ✅ Error handling patterns
   - ✅ Preflight checks (security validation)

### ⚠️ What's Stubbed/Incomplete

1. **Backend Analysis Functions**
   - ✅ `analyzeText` - Gemini-backed callable implemented
   - ✅ `explainSelection` - Gemini-backed callable implemented
   - ✅ `highlightRisks` - Gemini-backed callable implemented
   - ✅ `translateToPlainEnglish` - Gemini-backed callable implemented
   - 🟡 `analyzeByType` - Gemini call exists; still labeled placeholder and needs final hardening

2. **Frontend Features**
   - 🔴 Selection-based explanation contract mismatch (`success` expected vs backend `ok`)
   - 🔴 Risk highlighting contract/field mismatch (`success`, `riskLevel` assumptions)
   - 🔴 Plain English translation contract mismatch (`success` expected vs backend `ok`)
   - 🔴 Summarize Key Points (UI button only, no logic)
   - 🔴 Suggest Improvements (UI button only, no logic)

3. **Data Processing**
   - 🟡 Document type detection currently uses heuristic classification (non-LLM)
   - 🟡 Risk classification still needs frontend mapping normalization
   - 🟡 Text selection context extraction not optimized

---

## Architecture Overview

### Frontend Flow
```
DocumentViewer (main)
  └─ useDocumentAnalysis (hook)
      ├─ handleAnalyzeDocument() → analyzeText()
      ├─ handleAnalyzeByType() → analyzeByType()
      ├─ handleExplainSelection() → explainSelection()
      ├─ handleHighlightRisks() → highlightRisks()
      └─ handleTranslateToPlainEnglish() → translateToPlainEnglish()
  └─ AnalysisSidebar (results display)
  └─ AnalysisToolbox (action buttons)
```

### Backend Flow
```
Firebase Cloud Functions (gen2)
  ├─ analyzeText (calls Gemini → parses output)
  ├─ analyzeByType (calls Gemini with context → classification)
  ├─ explainSelection (calls Gemini → explanation)
  ├─ highlightRisks (calls Gemini → risk extraction)
  └─ translateToPlainEnglish (calls Gemini → translation)
```

---

## Implementation Roadmap

### Phase 1: Core Integration Alignment (Priority: CRITICAL)

#### 1.1 Verify `analyzeText` Contract + Output Mapping
**File:** `functions/index.js` (line 317)

**Current Status:** Gemini-backed implementation exists

**Tasks:**
- [ ] Confirm response shape consumed by frontend is stable
- [ ] Confirm schema validation and parsing behavior on malformed model output
- [ ] Add/extend tests for success and failure paths
- [ ] Ensure docs reference the current implementation state

**Implementation:**
```javascript
async function analyzePdfTextWithGemini(strippedText, stats, options) {
  // Use Gemini's advanced prompting to extract:
  // 1. Plain explanation
  // 2. Risk classification (high/medium/low)
  // 3. Unfair conditions
  // 4. Inconsistencies
  // 5. Obligations
  // 6. Missing information
  
  // Use JSON_SCHEMA mode for structured output
  const prompt = buildAnalysisPrompt(strippedText, stats);
  const response = await genAI.getGenerativeModel({model: 'gemini-2.0-flash'})
    .generateContent({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {
        responseSchema: getAnalysisSchema(),
        responseMimeType: 'application/json'
      }
    });
  
  return parseGeminiResponse(response);
}
```

**Dependencies:**
- Google Generative AI SDK (check if installed in functions/package.json)
- JSON schema for structured output
- Error recovery and retry logic

---

#### 1.2 Align `explainSelection` End-to-End Contract
**File:** `functions/index.js`, `src/hooks/useDocumentAnalysis.js`

**Current Status:** Backend exists; frontend contract is mismatched

**Tasks:**
- [ ] Frontend should check `result.data.ok` (or backend should also provide `success`)
- [ ] Normalize returned payload contract in docs and code comments
- [ ] Add test coverage for contract behavior

**Signature:**
```javascript
exports.explainSelection = functions.https.onCall(async ({ data, ...context }) => {
  // Implemented: Gemini-backed callable; returns { ok: true, explanation, usage }
});
```

---

#### 1.3 Align `highlightRisks` End-to-End Contract
**File:** `functions/index.js`, `src/hooks/useDocumentAnalysis.js`

**Current Status:** Backend exists; frontend assumes outdated fields

**Tasks:**
- [ ] Frontend should check `result.data.ok` (or backend should also provide `success`)
- [ ] Align field names (`severity` vs `riskLevel`) for rendering
- [ ] Add tests for risk payload mapping and UI consumption

**Output Structure:**
```javascript
{
  success: true,
  risks: {
    summary: { totalRisks: 3, high: 1, medium: 2, low: 0 },
    items: [
      {
        id: "risk-1",
        title: "Limitation of Liability",
        riskLevel: "high",
        description: "...",
        location: { page: 3, paragraph: 2 },
        recommendation: "..."
      }
    ]
  }
}
```

---

#### 1.4 Align `translateToPlainEnglish` End-to-End Contract
**File:** `functions/index.js`, `src/hooks/useDocumentAnalysis.js`

**Current Status:** Backend exists; frontend contract is mismatched

**Tasks:**
- [ ] Frontend should check `result.data.ok` (or backend should also provide `success`)
- [ ] Standardize response contract in docs (`ok` as canonical)
- [ ] Add tests for translation success/failure

---

#### 1.5 Fix `analyzeByType` Function
**File:** `functions/index.js` (line 1145)

**Current Status:** Calls Gemini, but return message and docs still classify it as placeholder

**Tasks:**
- [ ] Integrate with DocumentType detection system
- [ ] Call Gemini with type-specific validation prompts
- [ ] Return validation results based on document type
- [ ] Example: For "NDA", check for confidentiality terms, disclosures, etc.

---

### Phase 2: Advanced Features (Priority: HIGH)

#### 2.1 Selection Context Extraction
**File:** `src/hooks/useDocumentAnalysis.js`

**Current Issue:** Selection is hardcoded as `'Limitation of liability clause'`

**Tasks:**
- [ ] Implement text selection capture from PDF viewer
- [ ] Extract surrounding context (sentence before/after)
- [ ] Pass actual user selection to backend
- [ ] Store selection state in component

---

#### 2.2 Risk Highlighting UI
**File:** `src/components/DocumentViewer.jsx`

**Current Issue:** Risk badges are created but not visualized on PDF

**Tasks:**
- [ ] Render risk badges as overlays on PDF pages
- [ ] Position badges based on page/paragraph data
- [ ] Add click handlers to show detailed risk info
- [ ] Highlight text in PDF for risky clauses

---

#### 2.3 Summary & Improvements
**File:** `src/components/AnalysisToolbox.jsx`

**Current Status:** Buttons exist but no handlers

**Tasks:**
- [ ] Implement `handleSummarizeKeyPoints`
- [ ] Implement `handleSuggestImprovements`
- [ ] Create backend functions for these features

---

### Phase 3: Integration & Polish (Priority: MEDIUM)

#### 3.1 Gemini API Integration
**Files:**
- `functions/lib/gemini-client.js` (NEW)
- `functions/lib/prompts.js` (NEW)

**Tasks:**
- [ ] Create centralized Gemini client module
- [ ] Define prompt templates for each analysis type
- [ ] Implement retry/fallback logic
- [ ] Add request deduplication (cache recent results)

---

#### 3.2 Error Handling & Logging
**Tasks:**
- [ ] Add structured logging for API calls
- [ ] Implement graceful degradation (fallback to simpler analysis)
- [ ] Log usage metrics (tokens, latency)
- [ ] Monitor API quota and costs

---

#### 3.3 Performance Optimization
**Tasks:**
- [ ] Cache analysis results (5-15 min TTL)
- [ ] Implement incremental analysis (analyze sections, not full text)
- [ ] Add client-side debouncing for repeated calls
- [ ] Optimize token usage (compress context, summarize)

---

#### 3.4 Testing
**Tasks:**
- [ ] Write unit tests for all analysis functions
- [ ] Add integration tests with mock Gemini responses
- [ ] Create e2e tests for full analysis flow
- [ ] Test edge cases (empty docs, very long docs, non-English)

---

## Technical Details

### Gemini API Integration

**Package:** `@google/generative-ai`

**Check Installation:**
```bash
cd functions && npm list @google/generative-ai
```

**If Missing:**
```bash
npm install @google/generative-ai
```

**Usage Pattern:**
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({model: 'gemini-2.0-flash'});

const response = await model.generateContent({
  contents: [{role: 'user', parts: [{text: prompt}]}],
  generationConfig: {
    responseSchema: schema,
    responseMimeType: 'application/json'
  }
});
```

**Environment Variables Needed:**
- `GOOGLE_API_KEY` (set in Firebase Functions config)

---

### JSON Schema for Structured Output

**Example for Analysis:**
```javascript
const analysisSchema = {
  type: "OBJECT",
  properties: {
    plainExplanation: { type: "STRING" },
    risks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          title: { type: "STRING" },
          severity: { type: "STRING", enum: ["low", "medium", "high"] },
          whyItMatters: { type: "STRING" },
          whatToCheck: { type: "ARRAY", items: { type: "STRING" } },
          anchors: { type: "ARRAY" }
        }
      }
    }
  }
};
```

---

### Token Budget System

**Current Implementation:** ✅ Complete  
**Location:** `functions/index.js` (lines ~150-200)

**Tiers:**
- **Anonymous:** 20,000 tokens/uid (no daily reset)
- **Free:** 40,000 tokens/day
- **Pro:** Unlimited

**Usage Tracking:**
- Per-document hash ledger (forever retention)
- Daily usage docs (30-day TTL)
- Enforcement happens before Gemini call

---

## File Structure Changes

### New Files to Create
```
functions/
  ├─ lib/
  │  ├─ gemini-client.js           (Gemini API wrapper)
  │  ├─ prompts.js                 (Prompt templates)
  │  ├─ analysis-schema.js         (JSON schemas)
  │  └─ risk-classifier.js         (Risk extraction logic)
  └─ test/
     └─ analysis.test.js           (Unit tests)

Decodocs/web/
  ├─ src/
  │  ├─ hooks/
  │  │  └─ useTextSelection.js     (Selection capture hook)
  │  ├─ services/
  │  │  ├─ explainService.js       (Explain selection)
  │  │  ├─ risksService.js         (Risk highlighting)
  │  │  └─ translateService.js     (Plain English)
  │  └─ utils/
  │     └─ risk-rendering.js       (Risk badge rendering)
  └─ docs/
     └─ AI_ANALYSIS_INTEGRATION.md (Technical guide)
```

---

## Dependencies Check

### Frontend
```bash
cd Decodocs/web
npm list react-icons firebase/functions
```

### Backend
```bash
cd functions
npm list @google/generative-ai firebase-admin firebase-functions
```

**If missing, install:**
```bash
npm install @google/generative-ai
```

---

## Testing Strategy

### Unit Tests
- Mock Gemini responses
- Test schema validation
- Test error handling
- Test token budget logic

### Integration Tests
- Connect to emulator
- Test full analysis flow
- Verify storage/ledger updates
- Check usage tracking

### E2E Tests
- Upload real PDF
- Run analysis
- Verify results display
- Check performance

---

## Deployment Checklist

- [ ] `GOOGLE_API_KEY` set in Firebase config
- [ ] All new functions exported in `functions/index.js`
- [ ] Unit tests passing (100% coverage target)
- [ ] Integration tests passing
- [ ] E2E tests passing on staging
- [ ] Performance benchmarks meet targets (< 10s for analysis)
- [ ] Error logging configured
- [ ] Usage tracking validated
- [ ] Documentation updated
- [ ] Changelog updated

---

## Risk Assessment

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Gemini API quota exceeded | High | Implement budget system, monitor usage, set alerts |
| Slow analysis (>10s) | High | Implement caching, incremental analysis, timeout handling |
| Inaccurate risk detection | Medium | Add user feedback loop, improve prompts, add human review |
| Selection capture unreliable | Medium | Add fallback UI, improve selection detector, test extensively |
| Cost overruns | Medium | Implement token limits, monitor monthly spend, optimize prompts |

---

## Timeline Estimate

| Phase | Tasks | Effort | Timeline |
|-------|-------|--------|----------|
| 1.1 | Fix analyzeText | 4h | Day 1 |
| 1.2 | Implement explainSelection | 3h | Day 1 |
| 1.3 | Implement highlightRisks | 3h | Day 2 |
| 1.4 | Implement translateToPlainEnglish | 2h | Day 2 |
| 1.5 | Fix analyzeByType | 4h | Day 3 |
| 2.1-2.3 | Advanced features | 8h | Day 3-4 |
| 3.1-3.4 | Integration & polish | 8h | Day 4-5 |
| **Total** | **All phases** | **32h** | **~1 week** |

---

## Documentation References

- `Decodocs/docs/AI_SIGNATURE_STUDIO_FLOW.md` - AI safety & preflight
- `Decodocs/docs/FEATURES.md` - Feature list
- `Decodocs/docs/SUBSCRIPTION_TIERS.md` - Token budgets
- `Decodocs/docs/DEPLOYMENT.md` - Deployment guide

---

## Next Steps

1. **Immediate (Today):**
   - [ ] Review this plan with team
   - [ ] Verify Gemini API access & quota
   - [ ] Set up development environment
   - [ ] Create feature branch for Phase 1

2. **This Week:**
   - [ ] Complete Phase 1 (core functions)
   - [ ] Add basic tests
   - [ ] Deploy to staging
   - [ ] Manual testing

3. **Next Week:**
   - [ ] Complete Phase 2 & 3
   - [ ] Full test coverage
   - [ ] Performance optimization
   - [ ] Production deployment

---

## Questions & Notes

- **Gemini Model:** Using `gemini-2.0-flash`. Consider switching to `gemini-2.0-pro` for higher accuracy if budget allows.
- **Caching:** Should we cache results per docHash or per content hash? Currently per docHash.
- **Risk Extraction:** Consider training a classifier on historical data for better accuracy.
- **UI/UX:** Risk highlighting might need better visualization (currently badge-based, consider inline highlighting).

---

**Owner:** Development Team  
**Last Updated:** 2026-02-16  
**Status:** Ready for Implementation
