#!/usr/bin/env node
/**
 * Fetch MinIO config from deployed getDocByPath and save it locally for tests.
 *
 * Usage:
 *   node test/fetch-minio-config.js
 *
 * Optional env:
 *   FUNCTIONS_URL=https://<cloud-run-base-url>
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'snapsign-au';
const OUTPUT = path.join(__dirname, '.minio-test-config.json');
const QPATH = 'admin/minio';

async function main() {
  const baseUrl = process.env.FUNCTIONS_URL;

  if (!baseUrl) {
    console.log('Trying to fetch getDocByPath URL from gcloud...');
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
    } catch (_) {
      console.warn('Could not discover function URL via gcloud.');
    }

    console.error(
      '\nCould not find getDocByPath function URL.\n\n' +
      'Options:\n' +
      '  1. Set FUNCTIONS_URL: FUNCTIONS_URL=https://getdocbypath-xxxx-uc.a.run.app node test/fetch-minio-config.js\n' +
      '  2. Run gcloud auth:  gcloud auth application-default login (tests can read Firestore directly)\n' +
      '  3. Manually create test/.minio-test-config.json from Firebase Console.\n'
    );
    process.exit(1);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/getDocByPath`;
  await fetchAndSave(url);
}

async function fetchAndSave(getDocUrl) {
  console.log(`Fetching ${QPATH} from ${getDocUrl}...`);

  const res = await fetch(`${getDocUrl}?qpath=${encodeURIComponent(QPATH)}`);
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const json = await res.json();
  const data = json.data || json;

  if (!data.mode || !data.prod || !data.endpoint || !data.bucket) {
    console.error('Response does not look like valid MinIO config:', Object.keys(data));
    console.error('Expected: { mode, endpoint, bucket, prod: { accessKey, secretKey } }');
    process.exit(1);
  }

  if (!data.prod.accessKey || !data.prod.secretKey) {
    console.error('prod.accessKey/secretKey are missing in admin/minio');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`\n✓ Saved MinIO config (mode: ${data.mode}) to ${path.relative(process.cwd(), OUTPUT)}`);
  console.log('  You can now run: npm run test:minio');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
