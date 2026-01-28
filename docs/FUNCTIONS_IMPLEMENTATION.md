# Decodocs AI Functions - Implementation Documentation

## Overview
This document describes the implementation of backend AI functions for the Decodocs/SnapSign application. Both applications share the same Firebase project (`snapsign-au`), enabling unified authentication, data, and analytics. The system implements anonymous identity, document fingerprinting, preflight classification, text-first analysis, AI call accounting, and usage metrics storage.

## Architecture

### Components
- **Firebase Cloud Functions** - Serverless backend functions
- **Firestore** - Usage metrics storage (no document content)
- **Firebase Auth** - Anonymous authentication
- **Client-side** - PDF.js for text extraction, document hashing

### Data Flow
```
Client -> Extract text via PDF.js -> Compute docHash -> Preflight check -> AI analysis -> Response
```

## Function Specifications

### 1. Anonymous Identity
All AI functions require Firebase Anonymous Authentication:

```javascript
const validateAuth = (context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication is required for this operation.'
    );
  }
  return context.auth.uid;
};
```

### 2. Document Fingerprinting
Documents are identified using SHA-256 hash of PDF bytes:
- Format: `docHash = SHA-256(PDF bytes)`
- Used as stable document ID
- Stored as 64-character hexadecimal string

### 3. Preflight Classification (`preflightCheck`)

#### Input
```javascript
{
  "docHash": "hex_sha256",  // 64-char hex string
  "stats": {
    "pageCount": 12,
    "pdfSizeBytes": 1048576,
    "charsPerPage": [1200, 980, 0, 30],  // Character count per page
    "totalChars": 14500,
    "languageHint": "en"
  }
}
```

#### Processing
1. Validates docHash format
2. Computes scanRatio from charsPerPage statistics
3. Estimates token usage
4. Determines classification based on user plan and document characteristics

#### Output
```javascript
{
  "ok": true,
  "classification": "FREE_OK|PRO_REQUIRED|BLOCKED",
  "requiredPlan": "free|pro",
  "reasons": [
    {
      "code": "SCAN_DETECTED",
      "message": "Scanned PDFs require OCR (Pro)."
    }
  ],
  "stats": {
    "scanRatio": 0.25,
    "estimatedTokens": 8200
  }
}
```

#### Configuration
- `SCAN_RATIO_THRESHOLD = 0.20` - If >20% of pages have <30 chars, document is considered scanned
- `FREE_MAX_TOTAL_CHARS = 120000` - Size limit for Free tier

### 4. Text Analysis (`analyzeText`)

#### Input
```javascript
{
  "docHash": "hex_sha256",
  "stats": {
    "pageCount": 12,
    "charsPerPage": [1200, 980, 0, 30],
    "totalChars": 14500,
    "languageHint": "en"
  },
  "text": {
    "format": "paged",
    "value": "[PAGE 1] ... [PAGE 2] ...",  // Stripped text content
    "pageTextIndex": [{"page":1,"start":0,"end":1200}]  // Optional page indexing
  },
  "options": {
    "tasks": ["explain","caveats","inconsistencies"],
    "targetLanguage": null
  }
}
```

#### Enforcement Logic
1. Recomputes scanRatio from stats
2. Loads `usage_docs/${uid}_${docHash}` (creates if missing)
3. Gets user entitlement plan (free/pro)
4. Checks `aiCallsUsed < limit`, returns `PRO_REQUIRED` if exceeded
5. Validates text size guards
6. Calls LLM once (simulated in MVP)
7. Validates output schema
8. Increments `aiCallsUsed` atomically

#### Output
```javascript
{
  "ok": true,
  "docHash": "hex_sha256",
  "result": {
    "plainExplanation": "...",
    "risks": [
      {
        "id": "R1",
        "title": "Automatic renewal",
        "severity": "high",
        "whyItMatters": "...",
        "whatToCheck": ["..."],
        "anchors": [{"page":7,"quote":"…","confidence":0.62}]
      }
    ],
    "unfairConditions": [],
    "inconsistencies": [],
    "obligations": [],
    "missingInfo": []
  },
  "usage": {
    "aiCallsUsed": 1,
    "aiCallsRemaining": 0
  }
}
```

### 5. Entitlement Check (`getEntitlement`)

#### Output
```javascript
{
  "plan": "free|pro|premium",
  "aiCallsPerDocLimit": 1,  // Free: 1, Pro: 3 (configurable)
  "storageEnabled": false,
  "ocrEnabled": false
}
```

## Firestore Data Model

### Collection: `usage_docs`
**Document ID**: `${uid}_${docHash}`

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | User ID |
| `docHash` | string | Document hash |
| `createdAt` | timestamp | Creation time |
| `lastUsedAt` | timestamp | Last access time |
| `plan` | string | User plan at last use (free\|pro\|premium) |
| `aiCallsUsed` | number | Number of AI calls used |
| `scanRatio` | number | Calculated scan ratio (optional) |
| `pageCount` | number | Page count (optional) |
| `blockedReason` | string\|null | Reason for blocking (optional) |

**Client writes**: Disabled (only functions can write)

## Configuration Constants

```javascript
const CONFIG = {
  FREE_AI_CALLS_PER_DOC: 1,
  PRO_AI_CALLS_PER_DOC: 3,
  MIN_CHARS_PER_PAGE: 30,
  SCAN_RATIO_THRESHOLD: 0.20,
  FREE_MAX_TOTAL_CHARS: 120000,
  TTL_DAYS_USAGE_DOCS: 30
};
```

## Error Handling

### Error Codes
- `AUTH_REQUIRED` - Missing authentication
- `INVALID_DOC_HASH` - Invalid document hash format
- `SCAN_DETECTED_PRO_REQUIRED` - Scanned document detected
- `AI_BUDGET_EXCEEDED_PRO_REQUIRED` - AI call limit reached
- `PAYLOAD_TOO_LARGE` - Request too large
- `MODEL_ERROR_RETRYABLE` - Transient model error
- `MODEL_ERROR_FATAL` - Permanent model error

### Error Response Format
```javascript
{
  "ok": false,
  "code": "SCAN_DETECTED_PRO_REQUIRED",
  "message": "Scanned PDFs require OCR (Pro).",
  "requiredPlan": "pro"
}
```

## Validation & Schema Enforcement

### Output Schema Validation
All analyze functions validate and repair output schemas:
- Ensures required fields exist
- Normalizes risk objects to expected format
- Validates array types

### DocHash Validation
- Confirms 64-character hexadecimal format
- Rejects invalid hashes with `INVALID_DOC_HASH` error

## Deployment Notes

### Prerequisites
- Firebase project with Blaze (pay-as-you-go) plan for functions
- Firestore database enabled
- Firebase Auth with Anonymous sign-in enabled

### Security Rules
Firestore rules restrict access:
- Users can only read their own usage docs
- Client writes are disabled (only functions can write)

### Scheduled Cleanup
TTL cleanup runs daily to remove usage records older than 30 days.

## Client Integration

### Required Flow
1. Anonymous sign-in
2. PDF text extraction via PDF.js
3. Document hash computation
4. Preflight check
5. Conditional AI analysis based on preflight result

### Dependencies
- `firebase` SDK
- `pdfjs-dist` for client-side text extraction
- Web Crypto API for SHA-256 hashing

## Limitations & Future Enhancements

### MVP Limitations
- AI calls are simulated with mock data
- No OCR processing for scanned documents
- Fixed plan limits (not dynamically configurable)

### Planned Enhancements
- Production LLM integration
- OCR processing for scanned documents
- Dynamic plan configuration
- Advanced document analysis features