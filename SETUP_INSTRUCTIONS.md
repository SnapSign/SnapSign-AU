# DecoDocs/SnapSign Setup Instructions

## ⚠️ STRICT POLICY: No Environment Variables

**This project strictly prohibits the use of environment variables (`.env`, `.env.production`, etc.).** 

All configuration is handled through:
1. **Firebase Native Configuration**: Managed via `firebase.json` and the Firebase CLI.
2. **Firestore Secret Management**: Application-level secrets (API keys, service credentials, etc.) are stored in the Firestore database and fetched at runtime.

---

## Configuration Workflow

### 1. Firebase Native Configuration
The application is pre-configured to use the `snapsign-au` project. Ensure you have the Firebase CLI installed and are authenticated:

```bash
# Login to Firebase
firebase login

# Select the project
firebase use snapsign-au
```

Static hosting and function settings are defined in `firebase.json`. Do not add any "webframeworks" or SSR configuration.

### 2. Firestore Secret Management
Secrets are stored in a specific Firestore collection (e.g., `config` or `secrets`). To update or add secrets:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Firestore Database**.
3. Update the relevant document in the configuration collection.
4. The application will automatically fetch these updated values at runtime.

### 3. Deploying the Application
Since we do not use build-time environment variables, deployment is a simple static build:

```bash
# Build the application
cd decodocs/web
npm run build

# Deploy to hosting
cd ../..
firebase deploy --only hosting:decodocs
```

---

## Verification Steps

1. **Build**: `cd decodocs/web && npm run build`
2. **Deploy**: `firebase deploy --only hosting:decodocs`
3. **Test**: Verify the authentication and AI analysis flows on the deployed site.
4. **Automated Tests**: Run the unit test suite: `cd decodocs/web && npm test`.

## Troubleshooting

If authentication or AI features fail:
1. Check the **Firestore** configuration collection to ensure all required API keys are present.
2. Verify that **Anonymous Authentication** is enabled in the Firebase Console.
3. Ensure that Firestore security rules allow the application to read the configuration document.
4. Check the browser console for specific initialization errors.

**SECURITY NOTE**: Never include actual API keys, private keys, or service account credentials in this documentation, in `.env` files, or in source code. All secrets must reside exclusively in Firestore or be managed via Firebase CLI native tools.
