# DecoDocs Functions Tests

This directory contains unit and integration tests for the Firebase Functions.

## Running Tests

### Prerequisites
For emulator-based tests, make sure you have the Firebase CLI installed and emulators running:

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

```bash
npm run test:minio
```

Config load order:
1. Firestore `admin/minio` (ADC required): `gcloud auth application-default login`
2. Local fallback: `test/.minio-test-config.json`

Helper to fetch config into local fallback:

```bash
node test/fetch-minio-config.js
```

Expected source of truth:
- Firestore document `admin/minio`, typically written by
  `Decodocs/fileserver/setup-minio-app-user.yml`.

## Test Structure

The test suite includes:

1. **Preflight Check Tests**: Validate document classification logic
2. **Analyze Text Tests**: Verify text analysis and enforcement logic
3. **Entitlement Tests**: Check plan and limit validation
4. **Security Rule Tests**: Ensure proper access controls
5. **Stripe Integration Tests**: Verify Stripe config, product/price setup, checkout session creation, and webhook mock behavior
6. **MinIO Integration Tests**: Verify storage config and end-to-end S3 operations (head/put/get/delete + presigned URLs)

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
