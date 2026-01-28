# DecoDocs Functions Tests

This directory contains unit and integration tests for the Firebase Functions.

## Running Tests

### Prerequisites
Make sure you have the Firebase CLI installed and the emulators running:

```bash
npm install -g firebase-tools
```

### Unit Tests
To run unit tests only:

```bash
npm run test:unit
```

Or directly with mocha:

```bash
npx mocha test/functions.test.js --timeout 10000
```

### All Tests
To run all tests:

```bash
npm run test
```

## Test Structure

The test suite includes:

1. **Preflight Check Tests**: Validate document classification logic
2. **Analyze Text Tests**: Verify text analysis and enforcement logic
3. **Entitlement Tests**: Check plan and limit validation
4. **Security Rule Tests**: Ensure proper access controls

## Testing Approach

- Uses Firebase Emulator Suite for local testing
- Implements unit tests with Mocha and Chai
- Tests security rules using `@firebase/rules-unit-testing`
- Validates both positive and negative scenarios

## Key Test Cases

- Valid document classification (non-scanned)
- Scanned document detection
- Invalid document hash rejection
- AI call limit enforcement
- Plan-based feature access
- Security rule validation
