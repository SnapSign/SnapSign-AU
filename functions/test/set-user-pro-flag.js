#!/usr/bin/env node
/**
 * Toggle users/{uid}.isPro in Firestore for integration testing.
 *
 * Usage:
 *   node test/set-user-pro-flag.js <uid> true
 *   node test/set-user-pro-flag.js <uid> false
 *
 * Notes:
 * - Requires ADC (gcloud auth application-default login) or a valid
 *   GOOGLE_APPLICATION_CREDENTIALS service account.
 */

const admin = require('firebase-admin');

const PROJECT_ID = 'snapsign-au';

async function main() {
  const uid = String(process.argv[2] || '').trim();
  const raw = String(process.argv[3] || '').trim().toLowerCase();

  if (!uid) {
    console.error('Usage: node test/set-user-pro-flag.js <uid> <true|false>');
    process.exit(1);
  }
  if (!['true', 'false'].includes(raw)) {
    console.error('Second argument must be true or false.');
    process.exit(1);
  }

  const isPro = raw === 'true';

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  const db = admin.firestore();

  await db.collection('users').doc(uid).set(
    {
      isPro,
      subscription: {
        isPro,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedBy: 'test/set-user-pro-flag.js',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`✓ users/${uid}.isPro set to ${isPro}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
