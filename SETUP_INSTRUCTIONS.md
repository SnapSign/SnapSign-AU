# DecoDocs/SnapSign Setup Instructions

## Environment Configuration for Production

To properly configure the DecoDocs application in your Firebase project, you need to set up environment variables for the deployed site.

### Option 1: Using Firebase Extensions (Recommended)
If you have access to Firebase Extensions, you can set environment variables using the Firebase CLI:

```bash
# Set environment variables for the deployed site
firebase functions:config:set \
  firebase.api_key="your_api_key" \
  firebase.auth_domain="your_auth_domain" \
  firebase.project_id="your_project_id" \
  firebase.storage_bucket="your_storage_bucket" \
  firebase.messaging_sender_id="your_sender_id" \
  firebase.app_id="your_app_id"
```

### Option 2: Build-time Environment Variables
Since this is a static React/Vite app, environment variables need to be available at build time. You can:

1. Create a `.env.production` file in the `decodocs/web` directory:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

2. Rebuild and redeploy the application:
```bash
cd decodocs/web
npm run build
cd ../..
firebase deploy --only hosting:decodocs
```

### Option 3: Client-Side Configuration (For Testing Only)
If you need a temporary solution for testing, you can hardcode the configuration in the source code, but this is NOT recommended for production due to security concerns.

### Getting Your Firebase Configuration

To get the actual values for your `snapsign-au` Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your `snapsign-au` project
3. Navigate to Project Settings (gear icon)
4. Scroll down to the "Your apps" section
5. Look for the web app configuration (or add a new web app if needed)
6. Copy the configuration values

### Verification Steps

After configuring the environment variables:

1. Rebuild the application: `cd decodocs/web && npm run build`
2. Deploy: `firebase deploy --only hosting:decodocs`
3. Test the authentication flow manually on the deployed site
4. Run Playwright tests: `cd decodocs/web && npx playwright test`

### Troubleshooting

If authentication still fails:

1. Check browser console for Firebase initialization errors
2. Verify that all 6 Firebase configuration values are correctly set
3. Confirm that the Firebase project allows anonymous authentication in the Auth settings
4. Ensure the Firebase Functions are properly deployed and accessible

### Firebase Configuration Reference

See `.env.example` for the list of required environment variables. Never commit actual secrets or API keys to the repository.

**SECURITY WARNING**: Do not include actual API keys, private keys, or service account credentials in this documentation or in source code. Use environment variable files and secure secret management instead.
