# DecoDocs Functions Tests

This directory contains unit and integration tests for the Firebase Functions.

## Running Tests

### Prerequisites
Firebase emulators are not used in this repo. Tests should run against deployed Firebase where applicable.

Make sure you have the Firebase CLI installed:

```bash
npm install -g firebase-tools
```

For Stripe integration tests, emulators are not required; those tests call Stripe test mode and deployed endpoints.

### Unit Tests
To run unit tests only:

```bash
npm run test:unit
```

Or directly with mocha:

```bash
npx mocha test/functions.test.js --timeout 10000
```

Entitlement/storage policy helper tests:

```bash
npm run test:entitlement
```

Mock Pro flag for a specific user (Firestore `users/{uid}.isPro`):

```bash
npm run test:set-pro-flag -- <uid> true
npm run test:set-pro-flag -- <uid> false
```

### All Tests
To run all tests:

```bash
npm run test
```

### Stripe Integration Tests
Run the Stripe-focused suite:

```bash
npm run test:stripe
```

This suite uses real Stripe **test mode** APIs and validates deployed webhook behavior.

Config load order:
1. Firestore `admin/stripe` (ADC required): `gcloud auth application-default login`
2. Local fallback: `test/.stripe-test-config.json`

Helper to fetch config into local fallback:

```bash
node test/fetch-stripe-config.js
```

Webhook mock tests (section 6 in `stripe.test.js`) also require:

```bash
FUNCTIONS_URL=https://stripewebhookmock-xxxxx-uc.a.run.app npm run test:stripe
```

The value should be the Cloud Run base URL for your deployed functions service (without the route).

### MinIO Integration Tests
Run the MinIO-focused suite:

## Analysis Pipeline Integration Tests

Calls the **real deployed functions** with real Firebase anonymous and free-tier auth tokens.
No mocks, no emulators. Covers the full text-analysis pipeline including quota enforcement.

```bash
# Prerequisite (for quota seeding via Firestore admin):
gcloud auth application-default login

npm run test:analysis
```

What it tests:
- `preflightCheck` — readable / scanned / oversized docs (anon + free)
- `getEntitlement` — tier, feature flags, budget values; unauthenticated rejection
- `detectDocumentType` — invoice, job offer, privacy policy, SOP (heuristic, no AI cost)
- `analyzeText` — end-to-end Gemini call with structured response validation
- `explainSelection` — end-to-end Gemini call for legal clause explanation
- `analyzeByType` — detect → analyze pipeline with extracted fields
- **Quota: anonymous tier** — pre-seeds `users/{uid}.usage.anonTokensUsed` near the 20 000 limit; verifies allow then block behaviour (blocked calls never reach Gemini)
- **Quota: free tier** — pre-seeds `usage_daily/{uid}_{dayKey}.tokensUsed` near the 40 000 daily limit; verifies allow then block for both `analyzeText` and `explainSelection`

The quota and non-AI tests (preflightCheck, detectDocumentType) burn **zero** Gemini tokens.
The AI path tests use small fixtures (< 500 chars, ~50–100 tokens each).

Override the Cloud Run URL suffix via env:
```bash
FUNCTIONS_URL_SUFFIX=XXXXXX-uc.a.run.app npm run test:analysis
```



Helper to fetch config into local fallback:

```bash
node test/fetch-minio-config.js
```

Expected source of truth:
- Firestore document `admin/minio`, typically written by
  `Decodocs/fileserver/setup-minio-app-user.yml`.

## Test Structure

The test suite includes:

1. **Unit Tests** (`functions.test.js`, `analysis.test.js`, `limits.test.js`, `gemini-client.test.js`): Fast, fully mocked — no network, no quota consumed
2. **Analysis Integration Tests** (`analysis-integration.test.js`): Real deployed functions, real Firebase auth (anon + free tier), quota enforcement
3. **Stripe Integration Tests** (`stripe.test.js`): Real Stripe test-mode API + deployed webhook
4. **MinIO Integration Tests** (`minio.test.js`): Real MinIO storage with deployed config

## Testing Approach

- Uses Firebase Emulator Suite for local unit/security testing
- Implements unit tests with Mocha and Chai
- Tests security rules using `@firebase/rules-unit-testing`
- Validates both positive and negative scenarios
- Uses real Stripe test mode + deployed endpoints for Stripe integration validation

## Key Test Cases

- Valid document classification (non-scanned)
- Scanned document detection
- Invalid document hash rejection
- AI call limit enforcement
- Plan-based feature access
- Security rule validation
- Stripe config sanity (keys/price IDs/URLs)
- Stripe API test-mode connectivity
- Pro monthly/annual checkout session creation
- Mock webhook auth (`x-mock-secret`) and `isPro` transitions
- MinIO bucket reachability with non-root app credentials
- MinIO direct object CRUD and presigned URL round-trip
