#!/usr/bin/env node
/**
 * Fetch Stripe config from the deployed getDocByPath function
 * and save it locally for tests to use without ADC.
 *
 * Usage:
 *   node test/fetch-stripe-config.js
 *
 * Prerequisite:
 *   FUNCTIONS_URL env var pointing to your Cloud Run base URL, OR
 *   the script will try the Firebase default URL format.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'snapsign-au';
const OUTPUT = path.join(__dirname, '.stripe-test-config.json');

async function main() {
  // Try to discover the getDocByPath URL
  const baseUrl = process.env.FUNCTIONS_URL;

  if (!baseUrl) {
    console.log('Trying to fetch from gcloud...');
    // Try to get the URL from gcloud
    const { execSync } = require('child_process');
    try {
      const url = execSync(
        `gcloud run services describe getdocbypath --project=${PROJECT_ID} --region=us-central1 --format="value(status.url)"`,
        { encoding: 'utf8' }
      ).trim();

      if (url) {
        console.log(`Found getDocByPath at: ${url}`);
        await fetchAndSave(url);
        return;
      }
    } catch (e) {
      console.warn('Could not discover function URL via gcloud.');
    }

    console.error(
      '\nCould not find the getDocByPath function URL.\n\n' +
      'Options:\n' +
      '  1. Set FUNCTIONS_URL:  FUNCTIONS_URL=https://getdocbypath-xxxx-uc.a.run.app node test/fetch-stripe-config.js\n' +
      '  2. Run gcloud auth:   gcloud auth application-default login\n' +
      '     Then tests will read Firestore directly.\n' +
      '  3. Manually create test/.stripe-test-config.json from Firebase Console.\n'
    );
    process.exit(1);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/getDocByPath`;
  await fetchAndSave(url);
}

async function fetchAndSave(getDocUrl) {
  console.log(`Fetching admin/stripe from ${getDocUrl}...`);

  const res = await fetch(`${getDocUrl}?qpath=admin/stripe`);

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const json = await res.json();
  const data = json.data || json; // getDocByPath wraps in { path, data }

  // Sanity check — new mode-switching structure
  if (!data.mode || !data.test || !data.prod) {
    console.error('Response does not look like a valid mode-switching Stripe config:', Object.keys(data));
    console.error('Expected: { mode, test: { apiKey, ... }, prod: { apiKey, ... } }');
    process.exit(1);
  }

  if (!data.test.apiKey?.startsWith('sk_test_')) {
    console.error('test.apiKey does not start with sk_test_');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`\n✓ Saved Stripe config (mode: ${data.mode}) to ${path.relative(process.cwd(), OUTPUT)}`);
  console.log('  You can now run: npm run test:stripe');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
