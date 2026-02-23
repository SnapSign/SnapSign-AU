/**
 * Unit tests for lib/gemini-client.js
 *
 * Verifies that the Gemini client correctly reads API key and model from
 * the Firestore admin/gemini document, including the flat-key structure
 * currently in production:  { key: "AIzaSy..." }
 */

const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal firebase-admin stub that serves a single Firestore doc.
 * @param {object|null} docData  Data at admin/gemini, or null for missing doc.
 * @returns fake admin module
 */
const makeAdminStub = (docData) => {
  const db = {
    collection: (col) => ({
      doc: (id) => ({
        get: async () => ({
          exists: docData !== null,
          data: () => docData || {},
        }),
      }),
    }),
  };

  const adminStub = {
    apps: [{}], // mark as already initialised
    initializeApp: () => {},
    firestore: () => db,
  };

  return adminStub;
};

/**
 * Load a fresh (un-cached) instance of gemini-client via proxyquire,
 * injecting a specific admin/gemini document payload.
 */
const loadGeminiClient = (docData) =>
  proxyquire('../lib/gemini-client', {
    'firebase-admin': makeAdminStub(docData),
    // Prevent real GoogleGenerativeAI constructor call
    '@google/generative-ai': {
      GoogleGenerativeAI: class {
        getGenerativeModel({ model }) {
          return { _model: model };
        }
      },
    },
    'firebase-functions': {
      https: { HttpsError: class HttpsError extends Error {} },
    },
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('gemini-client: config loading from Firestore admin/gemini', () => {

  it('reads flat key structure (production format: { key: "AIza..." })', async () => {
    const client = loadGeminiClient({ key: 'AIzaTestKey-flat' });

    const model = await client.getGeminiModel();
    // Model was initialised successfully — key was resolved
    expect(model).to.exist;
    // Default model name used when no model field provided
    expect(client.getResolvedGeminiModelName()).to.equal('gemini-2.5-flash');
  });

  it('reads mode-scoped structure: { mode: "prod", prod: { key, model } }', async () => {
    const client = loadGeminiClient({
      mode: 'prod',
      prod: { key: 'AIzaTestKey-prod', model: 'gemini-2.5-flash' },
      test: { key: 'AIzaTestKey-test', model: 'gemini-2.5-flash' },
    });

    const model = await client.getGeminiModel();
    expect(model).to.exist;
    expect(client.getResolvedGeminiModelName()).to.equal('gemini-2.5-flash');
  });

  it('resolves legacy model alias gemini-2.0-flash → gemini-2.5-flash', async () => {
    const client = loadGeminiClient({
      key: 'AIzaTestKey-alias',
      model: 'gemini-2.0-flash', // legacy alias
    });

    const model = await client.getGeminiModel();
    expect(model).to.exist;
    // Alias should be normalised to the canonical name
    expect(client.getResolvedGeminiModelName()).to.equal('gemini-2.5-flash');
  });

  it('throws when admin/gemini document is missing', async () => {
    // null = doc does not exist in Firestore
    const client = loadGeminiClient(null);

    let error;
    try {
      await client.getGeminiModel();
    } catch (e) {
      error = e;
    }

    expect(error).to.exist;
    expect(error.message).to.include('admin/gemini');
  });

  it('throws when key field is empty / blank', async () => {
    const client = loadGeminiClient({ key: '   ' }); // present but blank

    let error;
    try {
      await client.getGeminiModel();
    } catch (e) {
      error = e;
    }

    expect(error).to.exist;
    expect(error.message).to.include('admin/gemini');
  });
});
