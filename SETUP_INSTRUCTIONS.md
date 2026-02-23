# DecoDocs/SnapSign Setup Instructions

## ⚠️ STRICT POLICY: No `.env*` Files

**This project prohibits `.env` files** (`.env`, `.env.local`, `.env.production`, etc.) and dotenv loaders.

All configuration is handled through:
1. **Firebase Native Configuration**: Managed via `firebase.json` and the Firebase CLI.
2. **Firestore Admin Config Docs**: Application-level secrets (API keys, service credentials, etc.) are stored in Firestore `admin/*` docs and fetched at runtime by Functions.
3. **Platform-provided process environment** (CI/Firebase runtime/shell) is allowed, but **do not rely on local `.env*` files**.

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

### 2. Firestore Admin Config Docs
Secrets are stored in Firestore `admin/*` documents. Common config docs:

- `admin/gemini` (Gemini API key + optional model override)
- `admin/stripe` (Stripe config)
- `admin/minio` (S3/MinIO storage config)

To update or add secrets:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Firestore Database**.
3. Update the relevant `admin/*` document.
4. Deployed Functions will pick up the updated values at runtime.

**Gemini key source of truth**
- Document: `admin/gemini`
- Field: `key`
- Logical field path: `/admin/gemini/key`

### 3. (Optional) Validate `admin/gemini` via deployed admin endpoint
The deployed `getDocByPath` endpoint is **admin-only** (requires a `@snapsign.com.au` Firebase ID token).

Use the helper script (redacts the key in output):

```bash
node functions/scripts/check-gemini-doc.mjs --base https://decodocs.com --token "$FIREBASE_ID_TOKEN"
```

### 4. Deploying the Application (Canonical)
Use the umbrella repo-root deploy script (builds + tests + verifies outputs + deploys):

```bash
./test-build-deploy.sh
```

Manual deploys are supported, but should be treated as a fallback:

```bash
firebase deploy --only functions
firebase deploy --only hosting:decodocs
firebase deploy --only hosting:decodocs-admin
```

---

## Verification Steps

1. **Build**: `npm --prefix Decodocs/web run build`
2. **Test**:
   - Unit: `npm --prefix Decodocs/web run test:unit`
   - E2E: `npm --prefix Decodocs/web run test:e2e`
3. **Deploy** (canonical): `./test-build-deploy.sh`
4. **Verify**: Auth + AI analysis flows on the deployed site.

## Troubleshooting

If authentication or AI features fail:
1. Check Firestore `admin/*` docs (especially `admin/gemini.key`) to ensure required keys are present.
2. Verify that **Anonymous Authentication** is enabled in the Firebase Console.
3. Check Firebase Functions logs for the exact backend error (UI may show a fallback message).
4. Check the browser console for client-side initialization errors.

**SECURITY NOTE**: Never include actual API keys, private keys, or service account credentials in this documentation, in `.env` files, or in source code. All secrets must reside exclusively in Firestore or be managed via Firebase CLI native tools.
