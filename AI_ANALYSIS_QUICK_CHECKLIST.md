# Quick Implementation Checklist - AI Analysis

## Summary
DecoDocs backend AI functions are implemented. Remaining work is **integration alignment**, **UI completion**, and **documentation/test updates**.

---

## CRITICAL BLOCKERS (Fix First)

- [ ] **Frontend/Backend response contract mismatch**
  - 🔴 Frontend checks `result.data.success` in several handlers, backend returns `ok`
  - 🎯 **Action:** Align handlers to `ok` (or add backward-compatible `success` in backend)
  - 📝 **Time:** ~2-4 hours
  - 📍 **Location:** `src/hooks/useDocumentAnalysis.js`

---

## BACKEND FUNCTION STATUS (Implemented)

### 1. `explainSelection` ✅ IMPLEMENTED
- 📌 **Backend:** `functions/index.js`
- ⚠️ **Remaining:** Frontend expects `success`; backend returns `ok`
- 🟥 **Priority:** CRITICAL (integration)

### 2. `highlightRisks` ✅ IMPLEMENTED
- 📌 **Backend:** `functions/index.js`
- ⚠️ **Remaining:** Frontend field assumptions (`riskLevel`) may mismatch backend schema (`severity`)
- 🟥 **Priority:** CRITICAL (integration)

### 3. `translateToPlainEnglish` ✅ IMPLEMENTED
- 📌 **Backend:** `functions/index.js`
- ⚠️ **Remaining:** Frontend expects `success`; backend returns `ok`
- 🟥 **Priority:** HIGH (integration)

---

## PARTIALLY STUBBED (Fix Implementation)

- [ ] **`analyzeByType` (Line 1145 in functions/index.js)**
  - 🟡 Gemini call exists but output/message still marked placeholder in places
  - 🎯 **Action:** finalize contract/output messaging and test behavior
  - 📝 **Time:** ~4 hours
  - 📍 **Location:** `functions/index.js:1145-1250`

---

## FRONTEND ISSUES (Minor)

- [ ] **Selection Capture Not Working**
  - 📍 **File:** `src/hooks/useDocumentAnalysis.js:360`
  - 🔴 **Issue:** Selection hardcoded as `'Limitation of liability clause'`
  - 🟡 **Status:** UI ready, needs hook implementation
  - ⏱️ **Effort:** ~2 hours

- [ ] **Risk Badge Rendering Missing**
  - 📍 **File:** `src/components/DocumentViewer.jsx`
  - 🔴 **Issue:** Risk badges created but not displayed on PDF
  - 🟡 **Status:** Data structure ready, needs visualization
  - ⏱️ **Effort:** ~3 hours

- [ ] **UI Buttons Without Logic**
  - 📍 **File:** `src/components/AnalysisToolbox.jsx:87-100`
  - 🔴 **Buttons:** "Summarize Key Points", "Suggest Improvements"
  - 🟡 **Status:** UI buttons exist, no handlers connected
  - ⏱️ **Effort:** ~2 hours

---

## DEPENDENCIES CHECK

```bash
# Check if Gemini SDK installed
cd functions && npm list @google/generative-ai

# If not installed, run:
npm install @google/generative-ai
```

**Status:** ❓ Run the check above

---

## ENVIRONMENT SETUP

**Required:** Set `GOOGLE_API_KEY` in Firebase Functions config

```bash
# For development (emulator)
firebase functions:config:set gemini.key="YOUR_API_KEY"

# Check current config
firebase functions:config:get
```

**Status:** ❓ Verify key is set

---

## STEP-BY-STEP FIX ORDER

### Day 1: Core Functions
1. ✅ Review this plan
2. ⬜ Align frontend contract checks to backend (`ok`)
3. ⬜ Validate explain/highlight/translate UI flows
4. ⬜ Fix risk field mapping (`severity` vs `riskLevel`)

### Day 2: Complete Core
1. ⬜ Finalize `analyzeByType` output messaging/contracts
2. ⬜ Update stale AI docs and architecture diagrams
3. ⬜ Unit tests for all functions (3h)

### Day 3: Frontend Integration
1. ⬜ Fix selection capture (2h)
2. ⬜ Implement risk badge rendering (3h)
3. ⬜ Add remaining button handlers (2h)

### Day 4: Testing & Deployment
1. ⬜ Integration tests (3h)
2. ⬜ E2E testing (2h)
3. ⬜ Deploy to staging (1h)
4. ⬜ Production deployment (1h)

---

## CODE LOCATIONS QUICK REFERENCE

| File | Lines | Issue |
|------|-------|-------|
| `functions/index.js` | 320+ | `analyzeText` implemented with Gemini |
| `functions/index.js` | 419+ | `explainSelection` implemented |
| `functions/index.js` | 464+ | `highlightRisks` implemented |
| `functions/index.js` | 508+ | `translateToPlainEnglish` implemented |
| `functions/index.js` | 1215+ | `analyzeByType` needs final hardening |
| `src/hooks/useDocumentAnalysis.js` | 393/433/487 | `success` checks mismatch backend `ok` |
| `src/components/DocumentViewer.jsx` | 630-680 | risk badge rendering |
| `src/components/AnalysisToolbox.jsx` | 87-100 | summary/improvements buttons |

---

## TESTING COMMANDS

```bash
# Run backend tests (will create when we add tests)
cd functions && npm test

# Run frontend tests
cd Decodocs/web && npm run test

# Test individual function in emulator
firebase functions:shell
> analyzeText({ docHash: 'test-hash', stats: {...}, text: {...} })
```

---

## DEBUGGING TIPS

### Check if Functions are Deployed
```bash
firebase functions:list
```

### View Function Logs
```bash
firebase functions:log
# Or in Firebase Console: Functions → Logs tab
```

### Test Gemini API
```bash
# Check API key works
curl -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

### Check Token Budget
```bash
# Firebase Firestore → Collections → docshashes & usage_events
# Verify ledgers are updating
```

---

## VERIFICATION CHECKLIST (Before Production)

- [ ] All 5 functions exist and are exported
- [ ] All functions have proper error handling
- [ ] Token budget system working
- [ ] Gemini API calls succeed
- [ ] Tests passing (unit + integration)
- [ ] Frontend handlers match backend response contract (`ok`)
- [ ] Performance: Analysis < 10 seconds
- [ ] Logging: All API calls logged
- [ ] Usage tracking: Verified in Firestore
- [ ] Documentation: README updated

---

## FILES TO CREATE/MODIFY

**New files to create:**
```
Decodocs/web/src/services/explainService.js
Decodocs/web/src/services/risksService.js
Decodocs/web/src/services/translateService.js
```

**Existing files to modify:**
```
functions/index.js                      (Contract/output hardening)
src/hooks/useDocumentAnalysis.js        (Align response checks)
src/components/DocumentViewer.jsx       (Add risk rendering)
src/components/AnalysisToolbox.jsx      (Connect button handlers)
```

---

## ESTIMATED TOTAL EFFORT

- **Phase 1 (Core):** 16 hours
- **Phase 2 (Frontend):** 7 hours
- **Phase 3 (Integration):** 9 hours
- **Total:** ~32 hours = **1 week (full-time) or 2 weeks (part-time)**

---

## SUCCESS CRITERIA

✅ **Definition of Done:**
1. All 5 analysis functions implemented and tested
2. Frontend receives real Gemini responses (not mock data)
3. UI displays analysis results correctly
4. All tools accessible and working
5. Token budgets enforced properly
6. Performance acceptable (< 10s per analysis)
7. Tests passing (>80% coverage)
8. Documentation complete
9. Staging environment verified
10. Ready for production deployment

---

## QUESTIONS?

- **Where's the Gemini API key?** → Firebase Functions config (set via `firebase functions:config:set`)
- **How many tokens per document?** → Varies by size; estimate: 1000-3000 tokens per average contract
- **What if Gemini fails?** → Return structured error/fallback response and surface actionable UI guidance.
- **Can I test without API key?** → Yes, use Firebase emulator + mock responses in tests
- **How to optimize costs?** → Use caching, compression, and incremental analysis

---

**Last Updated:** 2026-02-17  
**Owner:** Development Team  
**Status:** Integration Alignment In Progress
