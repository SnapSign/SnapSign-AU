# Phase 1.1: Fix `analyzeText` Function - Implementation Template

> Status: `snapshot/template`
>
> Use this as historical implementation context. Current behavior/spec authority:
> - `docs/FUNCTIONS_IMPLEMENTATION.md`
> - `Decodocs/docs/API.md`

## Overview
Replace hardcoded mock data in `functions/index.js:317` with real Gemini API integration.

---

## Current Code (Lines 317-400)

**File:** `functions/index.js`

```javascript
exports.analyzeText = functions.https.onCall(async ({ data, ...context }) => {
  // ... validation code ...
  
  // 🔴 PROBLEM: This is hardcoded mock data
  let mockAnalysis = {
    plainExplanation: "This document contains standard contractual terms...",
    risks: [
      { id: "R1", title: "Limitation of liability", severity: "high", ... },
      { id: "R2", title: "Automatic renewal", severity: "medium", ... }
    ],
    // ... more mock fields ...
  };
  
  // Currently just returns mock data
  return { ok: true, result: mockAnalysis, ... };
});
```

---

## Solution: Gemini Integration

### Step 1: Create Gemini Client Helper

**File to create:** `functions/lib/gemini-client.js`

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function callGeminiAnalysis(documentText, stats) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = buildAnalysisPrompt(documentText, stats);
  
  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseSchema: getAnalysisSchema(),
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
    },
  });
  
  const responseText = response.response.text();
  return JSON.parse(responseText);
}

function buildAnalysisPrompt(documentText, stats) {
  return `Analyze this legal document and provide structured output:

Document Stats:
- Pages: ${stats.pageCount}
- Total Characters: ${stats.totalChars}
- Estimated Language: ${stats.languageHint || 'English'}

Document Text:
${documentText.substring(0, 8000)}

Please provide:
1. Plain explanation of the document
2. Risk identification (high/medium/low)
3. Unfair conditions
4. Inconsistencies
5. Key obligations
6. Missing information

Format as JSON with the specified schema.`;
}

function getAnalysisSchema() {
  return {
    type: "OBJECT",
    properties: {
      plainExplanation: { type: "STRING", description: "Summary in plain language" },
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
            anchors: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  page: { type: "INTEGER" },
                  quote: { type: "STRING" },
                  confidence: { type: "NUMBER" },
                },
              },
            },
          },
        },
      },
      unfairConditions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            title: { type: "STRING" },
            description: { type: "STRING" },
          },
        },
      },
      inconsistencies: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            issue: { type: "STRING" },
            locations: { type: "ARRAY", items: { type: "INTEGER" } },
          },
        },
      },
      obligations: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            title: { type: "STRING" },
            description: { type: "STRING" },
            deadline: { type: "STRING" },
          },
        },
      },
      missingInfo: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            category: { type: "STRING" },
            description: { type: "STRING" },
          },
        },
      },
    },
    required: [
      "plainExplanation",
      "risks",
      "unfairConditions",
      "inconsistencies",
      "obligations",
      "missingInfo",
    ],
  };
}

module.exports = { callGeminiAnalysis, buildAnalysisPrompt, getAnalysisSchema };
```

---

### Step 2: Update `analyzeText` Function

**File to modify:** `functions/index.js` (line 317)

**Replace this section:**
```javascript
    // Simulate calling the AI service (this would be your actual LLM call)
    // In a real implementation, this would call your AI service
    let mockAnalysis = {
      plainExplanation: "This document contains standard contractual terms...",
      risks: [ ... ], // hardcoded mock
      // ...
    };
    
    mockAnalysis = validateOutputSchema(mockAnalysis);
```

**With this:**
```javascript
    // Call Gemini API for actual analysis
    let analysis;
    try {
      const { callGeminiAnalysis } = require('./lib/gemini-client');
      analysis = await callGeminiAnalysis(strippedText, stats);
    } catch (error) {
      // Fallback to basic analysis if Gemini fails
      console.error('Gemini API error, using fallback:', error);
      analysis = buildFallbackAnalysis(strippedText);
    }
    
    // Validate the response matches schema
    const validated = validateOutputSchema(analysis);
    if (!validated.ok) {
      throw new functions.https.HttpsError(
        'internal',
        'Analysis output validation failed: ' + validated.message
      );
    }
```

---

### Step 3: Add Fallback Analysis

**In same file, add this helper:**

```javascript
function buildFallbackAnalysis(text) {
  // Basic analysis when Gemini is unavailable
  return {
    plainExplanation: "This appears to be a legal document. A detailed analysis requires AI processing. Please try again.",
    risks: [],
    unfairConditions: [],
    inconsistencies: [],
    obligations: [],
    missingInfo: [
      {
        id: "M1",
        category: "analysis",
        description: "Full AI analysis temporarily unavailable. Please retry.",
      },
    ],
  };
}
```

---

### Step 4: Update Response Building

**Find and update this section (around line 390):**

```javascript
    return {
      ok: true,
      code: 'SUCCESS',
      result: {
        plainExplanation: analysis.plainExplanation,
        risks: analysis.risks,
        unfairConditions: analysis.unfairConditions || [],
        inconsistencies: analysis.inconsistencies || [],
        obligations: analysis.obligations || [],
        missingInfo: analysis.missingInfo || [],
      },
      usage: {
        estimatedTokens: estimatedTokens,
        remainingTokens: budget.remaining,
      },
    };
```

---

## Testing

### Unit Test Template

**File to create:** `functions/test/analyzeText.test.js`

```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const functions = require('firebase-functions-test')();

describe('analyzeText', () => {
  let analyzeText;
  
  before(() => {
    analyzeText = require('../index').analyzeText;
  });
  
  it('should call Gemini API and return analysis', async () => {
    const mockGeminiResponse = {
      plainExplanation: 'Test explanation',
      risks: [],
      unfairConditions: [],
      inconsistencies: [],
      obligations: [],
      missingInfo: [],
    };
    
    // Stub the Gemini call
    sinon.stub(require('../lib/gemini-client'), 'callGeminiAnalysis')
      .resolves(mockGeminiResponse);
    
    const result = await analyzeText({
      data: {
        docHash: 'test-hash',
        stats: { pageCount: 5, totalChars: 5000 },
        text: { value: 'Test document content' },
      },
      auth: { uid: 'test-user', token: { isAdmin: false } },
    });
    
    expect(result.ok).to.be.true;
    expect(result.result.plainExplanation).to.equal('Test explanation');
  });
  
  it('should use fallback when Gemini fails', async () => {
    // Stub Gemini to throw error
    sinon.stub(require('../lib/gemini-client'), 'callGeminiAnalysis')
      .rejects(new Error('API error'));
    
    const result = await analyzeText({
      data: {
        docHash: 'test-hash',
        stats: { pageCount: 5, totalChars: 5000 },
        text: { value: 'Test document' },
      },
      auth: { uid: 'test-user' },
    });
    
    expect(result.ok).to.be.true; // Still returns success with fallback data
    expect(result.result.missingInfo).to.have.lengthOf(1);
  });
});
```

---

## Environment Setup

### 1. Install Dependencies

```bash
cd functions
npm install @google/generative-ai
```

### 2. Set API Key

```bash
# For Firebase Functions
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"

# Verify it's set
firebase functions:config:get gemini
```

### 3. Local Testing with Emulator

```bash
# Start emulator
firebase emulators:start

# In another terminal, test the function
firebase functions:shell
> analyzeText({
    docHash: 'test-hash',
    stats: { pageCount: 1, charsPerPage: [1000], totalChars: 1000 },
    text: { format: 'paged', value: 'Sample contract text...' }
  })
```

---

## Checklist for Phase 1.1

- [ ] Gemini SDK installed (`npm install @google/generative-ai`)
- [ ] `functions/lib/gemini-client.js` created
- [ ] Gemini API key set in Firebase config
- [ ] `analyzeText` function updated to use Gemini
- [ ] Fallback logic implemented
- [ ] Response schema validation in place
- [ ] Unit tests written and passing
- [ ] Integration test passing (with mock Gemini)
- [ ] Local testing with emulator successful
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] Staging tested with real PDF
- [ ] Ready for production

---

## Deployment Command

```bash
# Deploy only the updated function
firebase deploy --only functions:analyzeText

# Or deploy all functions
firebase deploy --only functions

# Verify deployment
firebase functions:list
```

---

## Monitoring

After deployment, monitor:

```bash
# View logs
firebase functions:log

# Check Firestore usage_events
# Firebase Console → Firestore → Collections → usage_events

# Monitor Gemini API quota
# Google Cloud Console → Quota details for Gemini API
```

---

## Common Issues

### Issue: "GOOGLE_API_KEY not found"
**Solution:** Make sure key is set in Functions config:
```bash
firebase functions:config:set gemini.key="YOUR_KEY"
# Restart emulator or redeploy
```

### Issue: "Module '@google/generative-ai' not found"
**Solution:**
```bash
cd functions && npm install @google/generative-ai
```

### Issue: "Response validation failed"
**Solution:** Check if Gemini response matches the schema. Add debugging:
```javascript
console.log('Gemini raw response:', response.response.text());
// Validate JSON structure matches schema
```

---

## Time Estimate

- Setup & installation: 30 min
- Implementation: 2.5 hours
- Testing: 1 hour
- **Total: ~4 hours**

---

**Next Step:** After completing this, move to Phase 1.2 - Implement `explainSelection`
