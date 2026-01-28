# DecoDocs/SnapSign - Document Analysis Platform

## Overview
DecoDocs is a document analysis platform that uses AI to help users understand complex legal documents, contracts, and terms. The platform provides plain-English explanations of legal jargon, highlights potential risks, and identifies important clauses. DecoDocs shares the same Firebase project (`snapsign-au`) as SnapSign, enabling unified authentication, data, and analytics.

## Architecture
- **Frontend**: React/Vite application with PDF.js for client-side text extraction
- **Backend**: Firebase Functions for AI processing and authentication
- **Database**: Firestore for usage metrics (no document content stored)
- **Authentication**: Firebase Anonymous Auth for privacy-focused experience
- **Hosting**: Firebase Hosting for static assets

## Features
- Anonymous document analysis (no account required)
- Client-side PDF text extraction
- Document fingerprinting using SHA-256 hashing
- AI-powered document analysis with plain-English explanations
- Risk identification and categorization
- Interactive document viewer with highlights
- Usage tracking and plan enforcement

## Development Setup

### Prerequisites
- Node.js 18+
- Firebase CLI tools
- npm or yarn

### Installation
```bash
# Install dependencies
cd decodocs-repo/web
npm install

# Install functions dependencies
cd ../functions
npm install
```

### Environment Configuration
Create a `.env` file in the `decodocs-repo/web` directory with your Firebase configuration. To get the actual values for your `snapsign-au` Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your `snapsign-au` project
3. Navigate to Project Settings (gear icon)
4. Scroll down to the "Your apps" section
5. Click the "</>" icon to add a web app (register the DecoDocs web app)
6. Copy the configuration values and add them to your `.env` file:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Running Locally
```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start the development server
cd decodocs-repo/web
npm run dev
```

## API Endpoints

### Firebase Functions
- `preflightCheck`: Classify documents and estimate AI usage without calling AI
- `analyzeText`: Perform main document analysis
- `getEntitlement`: Retrieve user plan and limits

### Authentication
- Anonymous authentication required for all AI operations
- Document fingerprinting using SHA-256 of PDF bytes
- Usage tracked per (userId + documentHash) combination

## Security
- Client-side text extraction ensures documents never leave the browser
- Anonymous authentication protects user privacy
- Firestore security rules prevent unauthorized access
- Usage limits enforce fair use policies

## Testing

### Running Tests
```bash
# Run function unit tests
cd functions
npm run test:unit

# Run all tests
npm run test
```

Tests cover:
- Function input validation
- Document classification logic
- AI call limit enforcement
- Security rule compliance
- Error handling scenarios

## Deployment
```bash
# Deploy functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Data Model
Firestore collections:
- `usage_docs`: Per-user, per-document usage tracking (no content stored)
- `usage_events`: Event logging for analytics (no content stored)

## Privacy
- Documents are processed client-side only
- No document content is stored on servers
- Anonymous authentication preserves user privacy
- Usage data is retained temporarily and then purged

## Technologies Used
- React/Vite for frontend
- Firebase Functions for backend
- Firestore for data persistence
- PDF.js for PDF processing
- Tailwind CSS for styling
- Gemini AI for document analysis
