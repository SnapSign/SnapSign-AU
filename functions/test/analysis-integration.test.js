/**
 * Analysis Pipeline Integration Tests
 *
 * Calls the REAL deployed Firebase functions — no emulators, no mocks.
 * Verifies the full text-analysis flow for anonymous and free-tier users,
 * including quota enforcement for both tiers.
 *
 * Test coverage:
 *   1. preflightCheck      — anon + free tier
 *   2. getEntitlement       — anon + free tier
 *   3. detectDocumentType   — 4 doc types (heuristic, no AI cost)
 *   4. analyzeText          — e2e with Gemini (small text, ~50 tokens)
 *   5. explainSelection     — e2e with Gemini (small selection)
 *   6. analyzeByType        — e2e with Gemini + type pipeline
 *   7. Quota: anonymous tier — blocks when anonTokensUsed >= 20 000
 *   8. Quota: free tier     — blocks when daily tokensUsed >= 40 000
 *
 * Prerequisites:
 *   gcloud auth application-default login   (for Firestore pre-seeding in quota tests)
 *
 * Run:
 *   npm run test:analysis
 *
 * Override URLs via env:
 *   FUNCTIONS_URL_BASE=https://{fn}-XXXXXX-uc.a.run.app   (replaces ylrliabaza suffix)
 */

'use strict';

const { expect } = require('chai');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

// ─── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ID = 'snapsign-au';
const WEB_API_KEY = 'AIzaSyDqow-DLrBOZGUbGCN2nxpMCqXcbqDQe5Q';
const FN_SUFFIX = process.env.FUNCTIONS_URL_SUFFIX || 'ylrliabaza-uc.a.run.app';
const ANON_TOKENS_PER_UID = 20000;
const FREE_TOKENS_PER_DAY = 40000;
const FIREBASE_AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';

// Test email pattern — unique per run so there's no collision
const RUN_ID = Date.now().toString(36);
const TEST_EMAIL = `test-integration-${RUN_ID}@decodocs-test.invalid`;
const TEST_PASSWORD = `Passw0rd!${RUN_ID}`;

// ─── Cloud Run URL helpers ────────────────────────────────────────────────────

function fnUrl(name) {
  // name matches the lowercased Cloud Run service name derived from the export name
  return `https://${name}-${FN_SUFFIX}`;
}

const URLS = {
  preflightCheck: fnUrl('preflightcheck'),
  getEntitlement: fnUrl('getentitlement'),
  detectDocumentType: fnUrl('detectdocumenttype'),
  analyzeText: fnUrl('analyzetext'),
  explainSelection: fnUrl('explainselection'),
  highlightRisks: fnUrl('highlightrisks'),
  analyzeByType: fnUrl('analyzebytype'),
};

// ─── Firebase callable wire-protocol helper ───────────────────────────────────
//
// Gen-2 Firebase functions (Cloud Run) use the same callable HTTP protocol:
//   POST <url>
//   Content-Type: application/json
//   Authorization: Bearer <idToken>     ← omit for unauthenticated
//   Body: {"data": <payload>}
//
// Success response:  {"result": <value>}
// Error response:    {"error": {"message": "...", "status": "...", "details": ...}}

async function callFn(url, data, idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  const body = await res.json();

  if (body.error) {
    const err = new Error(body.error.message || 'Firebase function error');
    err.status = body.error.status;
    err.details = body.error.details;
    err.httpStatus = res.status;
    throw err;
  }

  // Callable functions wrap the return value in { result: ... }
  return body.result !== undefined ? body.result : body;
}

// ─── Firebase Auth REST helpers ───────────────────────────────────────────────

/** Create a real anonymous Firebase Auth user and return { uid, idToken }. */
async function createAnonUser() {
  const res = await fetch(`${FIREBASE_AUTH_BASE}:signUp?key=${WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error(`Anon sign-up failed: ${JSON.stringify(data)}`);
  return { uid: data.localId, idToken: data.idToken };
}

/** Create a real email/password Firebase Auth user (free tier) and return { uid, idToken, email }. */
async function createFreeUser() {
  const res = await fetch(`${FIREBASE_AUTH_BASE}:signUp?key=${WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error(`Email sign-up failed: ${JSON.stringify(data)}`);
  return { uid: data.localId, idToken: data.idToken, email: data.email };
}

// ─── Firestore / Auth helpers (for quota seeding) ────────────────────────────

/** Returns a gcloud access token, or null if gcloud is not authenticated. */
function getGcloudToken() {
  try {
    return execSync('gcloud auth print-access-token', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

/** Recursively converts a plain JS value to the Firestore REST wire format. */
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number')
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Write (create or overwrite) a Firestore document using the REST API and a
 * gcloud access token.  Throws if gcloud is unauthenticated.
 */
async function firestoreRestSet(docPath, data) {
  const token = getGcloudToken();
  if (!token) throw new Error('gcloud auth token unavailable — run: gcloud auth login');
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const fields = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firestore PATCH ${docPath} failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function deleteUser(uid) {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
    await admin.auth().deleteUser(uid);
  } catch (_) { /* best effort */ }
}

async function cleanupFirestoreUser(uid) {
  // Best-effort cleanup via admin SDK when credentials are available.
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
    const fdb = admin.firestore();
    await fdb.collection('users').doc(uid).delete();
    const overrideSnap = await fdb.collection('doc_type_overrides')
      .where('puid', '==', uid).limit(20).get();
    for (const d of overrideSnap.docs) await d.ref.delete();
  } catch (_) { /* best effort */ }
}

/** Pre-seed anonTokensUsed for an anonymous user via Firestore REST API. */
async function seedAnonUsage(uid, anonTokensUsed) {
  await firestoreRestSet(`users/${uid}`, { usage: { anonTokensUsed } });
}

function getDayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Pre-seed daily token usage for a free-tier user via Firestore REST API. */
async function seedFreeUsage(uid, tokensUsed) {
  const dayKey = getDayKey();
  await firestoreRestSet(`usage_daily/${uid}_${dayKey}`, { puid: uid, dayKey, tokensUsed });
}

async function cleanupFreeUsage(uid) {
  const dayKey = getDayKey();
  try {
    const token = getGcloudToken();
    if (!token) return;
    const docPath = `usage_daily/${uid}_${dayKey}`;
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
    await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  } catch (_) { /* best effort */ }
}

/**
 * Retry callFn on transient Gemini rate-limit errors.
 * Handles both the mapped RESOURCE_EXHAUSTED (after fix deployed) and
 * the generic internal error messages (before fix deployed).
 */
async function callFnWithRetry(url, data, idToken, opts = {}) {
  const maxRetries = opts.maxRetries ?? 3;
  const delayMs   = opts.delayMs   ?? 15000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callFn(url, data, idToken);
    } catch (err) {
      // Only retry on genuine Gemini rate-limit responses (now reliably propagated
      // as RESOURCE_EXHAUSTED after the gemini-json.js fix). Do NOT retry on
      // INTERNAL errors — those indicate real functional bugs.
      const isRateLimit = err.status === 'RESOURCE_EXHAUSTED';
      if (isRateLimit && attempt < maxRetries) {
        const wait = delayMs * (attempt + 1);
        console.log(`\n    ⏳ Rate-limited, retrying in ${wait / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

// ─── Document fixtures ────────────────────────────────────────────────────────
// Short texts (< 500 chars) to minimise token spend.
// detectDocumentType is heuristic; analyzeText sends these to Gemini.

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

const FIXTURES = {
  invoice: {
    text: [
      'TAX INVOICE',
      'ABN: 12 345 678 901',
      'Invoice No: INV-20240215',
      'To: Acme Pty Ltd',
      'Description: Professional services — Q4 2024',
      'Subtotal: $1,000.00',
      'GST (10%): $100.00',
      'Total: $1,100.00',
      'Payment due within 30 days.',
    ].join('\n'),
    expectedTypeId: 'business_invoice',
    expectedCategory: 'BUSINESS_LEGAL',
  },
  jobOffer: {
    text: [
      'Offer Letter',
      'Dear Jane Smith,',
      'We are pleased to offer you the position of Senior Engineer.',
      'Commencement date: 1 March 2025.',
      'Remuneration: $120,000 per annum plus superannuation.',
      'This offer is subject to satisfactory reference checks.',
      'Please sign and return by 10 February 2025.',
    ].join('\n'),
    expectedTypeId: 'legal_job_offer',
    expectedCategory: 'BUSINESS_LEGAL',
  },
  privacyPolicy: {
    text: [
      'Privacy Policy',
      'We are committed to protecting your personal information.',
      'This Privacy Policy explains how we collect, use and disclose data.',
      'Data collection: We may collect your name, email and usage data.',
      'We do not sell your personal information to third parties.',
      'Contact our Privacy Officer for any enquiries.',
    ].join('\n'),
    expectedTypeId: 'policy_privacy',
    expectedCategory: 'BUSINESS_LEGAL',
  },
  generalDoc: {
    text: [
      'Standard Operating Procedure — Document Archival',
      'Step 1: Gather all documents to be archived.',
      'Step 2: Sort by date and category.',
      'Step 3: Store in labelled folders in the filing room.',
      'This procedure must be followed by all staff.',
    ].join('\n'),
    expectedTypeId: 'general_sop_procedure',
    expectedCategory: 'GENERAL',
  },
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Analysis Pipeline Integration Tests', function () {
  this.timeout(200000); // Gemini calls can be slow; with rate-limit backoff up to ~2 min per test

  let anonUser;  // { uid, idToken }
  let freeUser;  // { uid, idToken, email }

  // ── Auth setup ──────────────────────────────────────────────────────────────

  before(async function () {
    console.log(`\n  Creating test auth users (run: ${RUN_ID})...`);
    [anonUser, freeUser] = await Promise.all([createAnonUser(), createFreeUser()]);
    console.log(`  ✓ Anon user: ${anonUser.uid}`);
    console.log(`  ✓ Free user: ${freeUser.uid} (${freeUser.email})\n`);
  });

  after(async function () {
    console.log('\n  Cleaning up test users...');
    await Promise.all([
      deleteUser(anonUser?.uid),
      deleteUser(freeUser?.uid),
      cleanupFirestoreUser(anonUser?.uid),
      cleanupFirestoreUser(freeUser?.uid),
      freeUser ? cleanupFreeUsage(freeUser.uid) : Promise.resolve(),
    ]);

    console.log('  ✓ Done\n');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. preflightCheck
  // ─────────────────────────────────────────────────────────────────────────────

  describe('1. preflightCheck', function () {
    const stats = {
      pageCount: 2,
      charsPerPage: [800, 750],
      totalChars: 1550,
      pdfSizeBytes: 51200,
      languageHint: 'en',
    };
    const docHash = sha256('preflight-integration-test-doc');

    it('1.1 anon user: readable doc → OK', async function () {
      const result = await callFn(URLS.preflightCheck, { docHash, stats }, anonUser.idToken);
      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('OK');
      expect(result.entitlement.tier).to.equal('anonymous');
      expect(result.stats.scanRatio).to.equal(0);
      expect(result.stats.estimatedTokens).to.be.a('number');
    });

    it('1.2 free user: readable doc → OK, tier=free', async function () {
      const result = await callFn(URLS.preflightCheck, { docHash, stats }, freeUser.idToken);
      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('OK');
      expect(result.entitlement.tier).to.equal('free');
    });

    it('1.3 anon user: scanned doc (all low-char pages) → PRO_REQUIRED classification', async function () {
      const scannedStats = {
        pageCount: 5,
        charsPerPage: [5, 3, 8, 2, 4], // all below MIN_CHARS_PER_PAGE=30
        totalChars: 22,
        pdfSizeBytes: 204800,
        languageHint: 'en',
      };
      const result = await callFn(URLS.preflightCheck, { docHash, stats: scannedStats }, anonUser.idToken);
      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('PRO_REQUIRED');
      expect(result.requiredTier).to.equal('pro');
      expect(result.reasons[0].code).to.equal('SCAN_DETECTED');
    });

    it('1.4 anon user: oversized doc → PRO_REQUIRED classification', async function () {
      const bigStats = {
        pageCount: 10,
        charsPerPage: [13000, 13000, 13000, 13000, 13000, 13000, 13000, 13000, 13000, 13000],
        totalChars: 130000, // > 120 000 FREE_MAX_TOTAL_CHARS
        pdfSizeBytes: 5242880,
        languageHint: 'en',
      };
      const result = await callFn(URLS.preflightCheck, { docHash, stats: bigStats }, anonUser.idToken);
      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('PRO_REQUIRED');
      expect(result.requiredTier).to.equal('pro');
      expect(result.reasons.some(r => r.code === 'SIZE_LIMIT_EXCEEDED')).to.equal(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. getEntitlement
  // ─────────────────────────────────────────────────────────────────────────────

  describe('2. getEntitlement', function () {
    it('2.1 anon user: returns anonymous tier with token budgets', async function () {
      const result = await callFn(URLS.getEntitlement, {}, anonUser.idToken);
      expect(result.tier).to.equal('anonymous');
      expect(result.isPro).to.equal(false);
      expect(result.storageEnabled).to.equal(false);
      expect(result.ocrEnabled).to.equal(false);
      expect(result.anonTokensPerUid).to.equal(ANON_TOKENS_PER_UID);
      expect(result.freeTokensPerDay).to.equal(FREE_TOKENS_PER_DAY);
    });

    it('2.2 free user: returns free tier', async function () {
      const result = await callFn(URLS.getEntitlement, {}, freeUser.idToken);
      expect(result.tier).to.equal('free');
      expect(result.isPro).to.equal(false);
      expect(result.storageEnabled).to.equal(false);
    });

    it('2.3 unauthenticated: rejects with unauthenticated error', async function () {
      let err;
      try {
        await callFn(URLS.getEntitlement, {});
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.status).to.equal('UNAUTHENTICATED');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. detectDocumentType  (heuristic — no AI, no token cost)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('3. detectDocumentType', function () {
    const baseStats = (text) => ({
      pageCount: 1,
      charsPerPage: [text.length],
      totalChars: text.length,
    });

    const cases = [
      {
        name: '3.1 invoice keywords → business_invoice / BUSINESS_LEGAL',
        fixture: 'invoice',
      },
      {
        name: '3.2 job offer keywords → legal_job_offer / BUSINESS_LEGAL',
        fixture: 'jobOffer',
      },
      {
        name: '3.3 privacy policy keywords → policy_privacy / BUSINESS_LEGAL',
        fixture: 'privacyPolicy',
      },
      {
        name: '3.4 SOP keywords → general_sop_procedure',
        fixture: 'generalDoc',
      },
    ];

    for (const tc of cases) {
      it(tc.name, async function () {
        const fix = FIXTURES[tc.fixture];
        const docHash = sha256(fix.text);
        const result = await callFn(
          URLS.detectDocumentType,
          { docHash, text: { value: fix.text }, stats: baseStats(fix.text) },
          anonUser.idToken
        );
        expect(result.ok).to.equal(true);
        expect(result.typeId).to.equal(fix.expectedTypeId, `typeId mismatch for ${tc.fixture}`);
        expect(result.confidence).to.be.at.least(0.5);
        expect(result.reasons).to.be.an('array').with.length.at.least(1);
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. analyzeText  (real Gemini call, ~50–100 tokens per test)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('4. analyzeText — end-to-end with Gemini', function () {
    it('4.1 anon user: invoice text → structured analysis result', async function () {
      const text = FIXTURES.invoice.text;
      const docHash = sha256(`analyzeText-invoice-${RUN_ID}`);
      const result = await callFnWithRetry(URLS.analyzeText, {
        docHash,
        text: { value: text },
        stats: { totalChars: text.length },
        options: { documentType: 'business_invoice' },
      }, anonUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.docHash).to.equal(docHash);
      expect(result.result).to.be.an('object');
      expect(result.result.plainExplanation).to.be.a('string').with.length.above(10);
      expect(result.result.risks).to.be.an('array');
      expect(result.result.obligations).to.be.an('array');
      expect(result.usage.estimatedTokens).to.be.a('number').that.is.above(0);
      expect(result.usage.remainingTokens).to.be.a('number');
      expect(result.entitlement.tier).to.equal('anonymous');
    });

    it('4.2 free user: job offer text → analysis with tier=free', async function () {
      const text = FIXTURES.jobOffer.text;
      const docHash = sha256(`analyzeText-joboffer-${RUN_ID}`);
      const result = await callFnWithRetry(URLS.analyzeText, {
        docHash,
        text: { value: text },
        stats: { totalChars: text.length },
      }, freeUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.entitlement.tier).to.equal('free');
      expect(result.result.plainExplanation).to.be.a('string').with.length.above(10);
    });

    it('4.3 anon user: missing text → INVALID_ARGUMENT error', async function () {
      const docHash = sha256('analyzeText-no-text');
      let err;
      try {
        await callFn(URLS.analyzeText, {
          docHash,
          stats: { totalChars: 100 },
          // text deliberately omitted
        }, anonUser.idToken);
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.status).to.equal('INVALID_ARGUMENT');
    });

    it('4.4 anon user: bad docHash → INVALID_ARGUMENT error', async function () {
      let err;
      try {
        await callFn(URLS.analyzeText, {
          docHash: 'not-a-valid-hash',
          text: { value: 'some text' },
          stats: { totalChars: 9 },
        }, anonUser.idToken);
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
      expect(err.status).to.equal('INVALID_ARGUMENT');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. explainSelection  (real Gemini call)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('5. explainSelection — end-to-end with Gemini', function () {
    it('5.1 anon user: legal clause → plain-English explanation', async function () {
      const selection = 'Remuneration: $120,000 per annum plus statutory superannuation at the applicable rate.';
      const docContext = 'Employment offer letter';
      const docHash = sha256(`explainSelection-${RUN_ID}`);

      const result = await callFnWithRetry(URLS.explainSelection, {
        docHash,
        selection,
        documentContext: docContext,
      }, anonUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.explanation).to.be.an('object');
      // explanation schema: { summary, implications, actionItems, ... }
      const expText = JSON.stringify(result.explanation);
      expect(expText.length).to.be.above(20);
      expect(result.usage.remainingTokens).to.be.a('number');
    });

    it('5.2 anon user: missing selection → error', async function () {
      let err;
      try {
        await callFn(URLS.explainSelection, {
          docHash: sha256('explain-no-sel'),
          // selection deliberately omitted
        }, anonUser.idToken);
      } catch (e) {
        err = e;
      }
      expect(err).to.exist;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. analyzeByType  (detectDocumentType → analyzeByType pipeline)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('6. analyzeByType — type-specific Gemini analysis', function () {
    it('6.1 anon user: invoice text → type-specific result with extracted fields', async function () {
      const text = FIXTURES.invoice.text;
      const docHash = sha256(`analyzeByType-invoice-${RUN_ID}`);
      const stats = { pageCount: 1, charsPerPage: [text.length], totalChars: text.length };

      // Step 1: detect type (heuristic, no AI)
      const detected = await callFn(URLS.detectDocumentType, {
        docHash, text: { value: text }, stats,
      }, anonUser.idToken);
      expect(detected.ok).to.equal(true);
      expect(detected.typeId).to.equal('business_invoice');

      // Step 2: analyze by type (AI)
      const result = await callFnWithRetry(URLS.analyzeByType, {
        docHash, text: { value: text }, stats,
      }, anonUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.effectiveTypeId).to.equal('business_invoice');
      expect(result.result).to.be.an('object');
      expect(result.result.plainExplanation).to.be.a('string').with.length.above(5);
      expect(result.result.extracted).to.be.an('object');
      expect(result.usage.estimatedTokens).to.be.a('number');
    });

    it('6.2 free user: job offer text → type-specific result', async function () {
      const text = FIXTURES.jobOffer.text;
      const docHash = sha256(`analyzeByType-job-${RUN_ID}`);
      const stats = { pageCount: 1, charsPerPage: [text.length], totalChars: text.length };

      const result = await callFnWithRetry(URLS.analyzeByType, {
        docHash, text: { value: text }, stats,
      }, freeUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.tier).to.equal('free');
      expect(result.result.plainExplanation).to.be.a('string').with.length.above(5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Quota enforcement — anonymous tier
  //
  // Gemini is NOT called when quota is exceeded — the function returns early
  // with { ok: false, code: 'ANON_TOKEN_LIMIT' }. These tests burn zero Gemini
  // tokens on the "blocked" path.
  // ─────────────────────────────────────────────────────────────────────────────

  describe('7. Quota enforcement — anonymous tier', function () {
    let quotaAnonUser; // dedicated user for quota seeding to avoid cross-test pollution
    const NEAR_LIMIT = ANON_TOKENS_PER_UID - 50; // 19 950 tokens used

    before(async function () {
      if (!getGcloudToken()) {
        console.warn('\n  ⚠  Skipping anon quota tests — gcloud token unavailable.');
        console.warn('     Run: gcloud auth login\n');
        this.skip();
        return;
      }
      quotaAnonUser = await createAnonUser();
      console.log(`\n  Quota anon user: ${quotaAnonUser.uid}`);
      console.log(`  Pre-seeding usage: anonTokensUsed = ${NEAR_LIMIT} (limit = ${ANON_TOKENS_PER_UID})`);
      await seedAnonUsage(quotaAnonUser.uid, NEAR_LIMIT);
    });

    after(async function () {
      if (quotaAnonUser) {
        await deleteUser(quotaAnonUser.uid);
        await cleanupFirestoreUser(quotaAnonUser.uid);
      }
    });

    it('7.1 call with 20 tokens (used 19 950 → 19 970 < 20 000) → allowed', async function () {
      if (!quotaAnonUser) return this.skip();
      // stats.totalChars = 80 → estimatedTokens = 20 (below remaining gap of 50)
      const docHash = sha256(`quota-anon-allowed-${RUN_ID}`);
      const result = await callFnWithRetry(URLS.analyzeText, {
        docHash,
        text: { value: 'short text for quota test' },
        stats: { totalChars: 80 }, // 80 / 4 = 20 tokens
      }, quotaAnonUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.usage.estimatedTokens).to.equal(20);
      expect(result.usage.remainingTokens).to.be.lessThan(ANON_TOKENS_PER_UID);
    });

    it('7.2 call with 200 tokens (would exceed limit) → blocked, code=ANON_TOKEN_LIMIT', async function () {
      if (!quotaAnonUser) return this.skip();
      // After previous test: ~19 970 tokens used.
      // stats.totalChars = 800 → 200 tokens, which pushes over 20 000.
      const docHash = sha256(`quota-anon-blocked-${RUN_ID}`);
      const result = await callFn(URLS.analyzeText, {
        docHash,
        text: { value: 'another short text' },
        stats: { totalChars: 800 }, // 200 tokens — Gemini NOT called
      }, quotaAnonUser.idToken);

      // Function returns gracefully, not an HTTP error
      expect(result.ok).to.equal(false);
      expect(result.code).to.equal('ANON_TOKEN_LIMIT');
      expect(result.requiredTier).to.equal('free');
      expect(result.usage.remainingTokens).to.be.a('number');
    });

    it('7.3 analyzeByType similarly blocked at anon limit', async function () {
      if (!quotaAnonUser) return this.skip();
      const docHash = sha256(`quota-anon-bytype-${RUN_ID}`);
      const result = await callFn(URLS.analyzeByType, {
        docHash,
        // 'x'.repeat(2000) = 2000 chars → 500 estimated tokens, well above the ~30 remaining
        text: { value: 'x'.repeat(2000) },
      }, quotaAnonUser.idToken);

      expect(result.ok).to.equal(false);
      expect(result.code).to.equal('ANON_TOKEN_LIMIT');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Quota enforcement — free tier  (daily limit)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('8. Quota enforcement — free tier (daily)', function () {
    let quotaFreeUser;
    const RUN_FREE_EMAIL = `test-quota-free-${RUN_ID}@decodocs-test.invalid`;
    const NEAR_FREE_LIMIT = FREE_TOKENS_PER_DAY - 200; // 39 800 tokens used today — 200-token headroom accommodates up to ~10 retry increments of 20 tokens each

    before(async function () {
      this.timeout(180000);
      if (!getGcloudToken()) {
        console.warn('\n  ⚠  Skipping free-tier quota tests — gcloud token unavailable.\n');
        this.skip();
        return;
      }

      // Cooldown after section 7's Gemini call to clear the free-tier rate-limit window.
      console.log('\n  ⏳ Waiting 120s for Gemini rate-limit to clear...');
      await new Promise(r => setTimeout(r, 120000));

      // Create a dedicated free user for quota tests
      const res = await fetch(`${FIREBASE_AUTH_BASE}:signUp?key=${WEB_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: RUN_FREE_EMAIL, password: TEST_PASSWORD, returnSecureToken: true }),
      });
      const data = await res.json();
      if (!data.idToken) throw new Error('Could not create free quota test user');
      quotaFreeUser = { uid: data.localId, idToken: data.idToken };

      console.log(`\n  Quota free user: ${quotaFreeUser.uid}`);
      console.log(`  Pre-seeding daily usage: tokensUsed = ${NEAR_FREE_LIMIT} (limit = ${FREE_TOKENS_PER_DAY})`);
      await seedFreeUsage(quotaFreeUser.uid, NEAR_FREE_LIMIT);
    });

    after(async function () {
      if (quotaFreeUser) {
        await deleteUser(quotaFreeUser.uid);
        await cleanupFreeUsage(quotaFreeUser.uid);
        await cleanupFirestoreUser(quotaFreeUser.uid);
      }
    });

    it('8.1 call with 20 tokens (used 39 950 → 39 970 < 40 000) → allowed', async function () {
      if (!quotaFreeUser) return this.skip();
      const docHash = sha256(`quota-free-allowed-${RUN_ID}`);
      const result = await callFnWithRetry(URLS.analyzeText, {
        docHash,
        text: { value: 'short text' },
        stats: { totalChars: 80 }, // 20 tokens
      }, quotaFreeUser.idToken);

      expect(result.ok).to.equal(true);
      expect(result.entitlement.tier).to.equal('free');
      expect(result.usage.estimatedTokens).to.equal(20);
    });

    it('8.2 call with 200 tokens (pushes over daily limit) → blocked, code=FREE_TOKEN_LIMIT', async function () {
      if (!quotaFreeUser) return this.skip();
      // After test 8.1: ~39 820 used. 200 tokens pushes to 40 020 > 40 000.
      const docHash = sha256(`quota-free-blocked-${RUN_ID}`);
      const result = await callFn(URLS.analyzeText, {
        docHash,
        text: { value: 'another text' },
        stats: { totalChars: 800 }, // 200 tokens — Gemini NOT called
      }, quotaFreeUser.idToken);

      expect(result.ok).to.equal(false);
      expect(result.code).to.equal('FREE_TOKEN_LIMIT');
      expect(result.requiredTier).to.equal('pro');
      expect(result.usage.remainingTokens).to.be.a('number');
    });

    it('8.3 explainSelection also blocked at daily limit → RESOURCE_EXHAUSTED', async function () {
      if (!quotaFreeUser) return this.skip();
      const docHash = sha256(`quota-free-explain-${RUN_ID}`);

      // selection.length 400 → estimatedTokens = ceil(400/4) + 500 = 600.
      // User has ~39 820 tokens used; 39 820 + 600 > 40 000 → blocked.
      // explainSelection throws HttpsError('resource-exhausted') on budget block,
      // which callFn surfaces as a thrown error with status = RESOURCE_EXHAUSTED.
      let err;
      try {
        await callFn(URLS.explainSelection, {
          docHash,
          selection: 'x'.repeat(400),
          documentContext: 'test',
        }, quotaFreeUser.idToken);
      } catch (e) {
        err = e;
      }

      expect(err, 'expected quota block error').to.exist;
      expect(err.status).to.equal('RESOURCE_EXHAUSTED');
    });
  });
});
