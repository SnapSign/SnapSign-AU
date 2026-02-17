const { expect } = require('chai');
const proxyquire = require('proxyquire');
const test = require('firebase-functions-test')();

const makeFirestoreStub = () => {
  const docs = new Map();

  const getDocData = (path) => docs.get(path);

  const setDocData = (path, payload, options = {}) => {
    const prev = docs.get(path) || {};
    const next = options.merge ? { ...prev, ...payload } : { ...payload };
    docs.set(path, next);
  };

  return {
    collection: (name) => ({
      doc: (id) => {
        const path = `${name}/${id}`;
        return {
          get: async () => {
            const data = getDocData(path);
            return {
              exists: !!data,
              data: () => data,
            };
          },
          set: async (payload, options) => {
            setDocData(path, payload, options);
          },
        };
      },
      add: async () => ({ id: `mock-${Date.now()}` }),
      where: () => ({
        get: async () => ({
          forEach: () => {},
        }),
      }),
    }),
    runTransaction: async (fn) => fn({
      get: async () => ({ exists: false, data: () => ({}) }),
      set: async () => {},
    }),
    batch: () => ({
      delete: () => {},
      commit: async () => {},
    }),
    __seed: (path, data) => {
      docs.set(path, data);
    },
    __clear: () => {
      docs.clear();
    },
  };
};

describe('DecoDocs Functions Unit Tests', () => {
  let myFunctions;
  let firestoreStub;
  let getGeminiModelStub;

  before(() => {
    firestoreStub = makeFirestoreStub();
    const firestoreFn = () => firestoreStub;
    firestoreFn.FieldValue = {
      serverTimestamp: () => ({ __type: 'serverTimestamp' }),
      increment: (n) => ({ __type: 'increment', value: n }),
    };

    const adminStub = {
      apps: [],
      initializeApp: function initializeApp() {
        if (this.apps.length === 0) this.apps.push({});
      },
      firestore: firestoreFn,
      credential: { cert: () => ({}) },
    };

    const modelStub = {
      generateContent: async () => ({
        response: {
          text: () =>
            JSON.stringify({
              plainExplanation: 'stub-analysis',
              risks: [],
              unfairConditions: [],
              inconsistencies: [],
              obligations: [],
              missingInfo: [],
            }),
        },
      }),
    };
    getGeminiModelStub = async () => modelStub;

    myFunctions = proxyquire('../index', {
      'firebase-admin': adminStub,
      './lib/gemini-client': {
        getGeminiModel: getGeminiModelStub,
      },
      './lib/prompts': {
        buildAnalysisPrompt: () => 'analysis prompt',
        buildExplanationPrompt: () => 'explain prompt',
        buildRiskPrompt: () => 'risk prompt',
        buildTranslationPrompt: () => 'translation prompt',
        buildTypeSpecificPrompt: () => 'type prompt',
      },
    });
  });

  beforeEach(() => {
    firestoreStub.__clear();
  });

  after(() => {
    test.cleanup();
  });

  describe('preflightCheck', () => {
    it('classifies readable documents as OK for free users', async () => {
      const wrapped = test.wrap(myFunctions.preflightCheck);
      const result = await wrapped({
        data: {
          docHash: 'a'.repeat(64),
          stats: {
            pageCount: 10,
            charsPerPage: [1000, 1200, 800, 1500, 900, 1100, 700, 1300, 1000, 950],
            totalChars: 10450,
            pdfSizeBytes: 1048576,
            languageHint: 'en',
          },
        },
        auth: { uid: 'test-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('OK');
      expect(result.requiredTier).to.equal('free');
      expect(result.stats.scanRatio).to.be.lessThan(0.2);
    });

    it('detects scanned documents and requires pro tier', async () => {
      const wrapped = test.wrap(myFunctions.preflightCheck);
      const result = await wrapped({
        data: {
          docHash: 'b'.repeat(64),
          stats: {
            pageCount: 10,
            charsPerPage: [10, 5, 0, 15, 20, 5, 0, 10, 25, 30],
            totalChars: 120,
            pdfSizeBytes: 2048576,
            languageHint: 'en',
          },
        },
        auth: { uid: 'test-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('PRO_REQUIRED');
      expect(result.requiredTier).to.equal('pro');
      expect(result.reasons.some((r) => r.code === 'SCAN_DETECTED')).to.equal(true);
    });

    it('requires pro when document exceeds free size threshold', async () => {
      const wrapped = test.wrap(myFunctions.preflightCheck);
      const result = await wrapped({
        data: {
          docHash: 'c'.repeat(64),
          stats: {
            pageCount: 2,
            charsPerPage: [70000, 70001], // not scan-like, but too large overall
            totalChars: 140001, // > FREE_MAX_TOTAL_CHARS (120000)
            pdfSizeBytes: 4096,
            languageHint: 'en',
          },
        },
        auth: { uid: 'free-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('PRO_REQUIRED');
      expect(result.requiredTier).to.equal('pro');
      expect(result.reasons.some((r) => r.code === 'SIZE_LIMIT_EXCEEDED')).to.equal(true);
    });

    it('does not gate pro users on scan/size in preflight', async () => {
      firestoreStub.__seed('users/pro-user', { isPro: true });
      const wrapped = test.wrap(myFunctions.preflightCheck);
      const result = await wrapped({
        data: {
          docHash: 'd'.repeat(64),
          stats: {
            pageCount: 10,
            charsPerPage: [1, 0, 0, 2, 1, 0, 2, 1, 0, 1], // scan-like
            totalChars: 200000, // very large
            pdfSizeBytes: 8096,
            languageHint: 'en',
          },
        },
        auth: { uid: 'pro-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.ok).to.equal(true);
      expect(result.classification).to.equal('OK');
      expect(result.entitlement.tier).to.equal('pro');
      expect(result.entitlement.isPro).to.equal(true);
      expect(result.reasons).to.have.length(0);
    });

    it('rejects invalid docHash', async () => {
      const wrapped = test.wrap(myFunctions.preflightCheck);
      try {
        await wrapped({
          data: {
            docHash: 'invalid-hash',
            stats: {
              pageCount: 1,
              charsPerPage: [100],
              totalChars: 100,
              pdfSizeBytes: 1000,
              languageHint: 'en',
            },
          },
          auth: { uid: 'test-user', token: { firebase: { sign_in_provider: 'password' } } },
        });
        expect.fail('Expected invalid-argument');
      } catch (e) {
        expect(e.code).to.equal('invalid-argument');
      }
    });
  });

  describe('getEntitlement', () => {
    it('returns free entitlements for non-pro users', async () => {
      const wrapped = test.wrap(myFunctions.getEntitlement);
      const result = await wrapped({
        data: {},
        auth: { uid: 'test-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.tier).to.equal('free');
      expect(result.isPro).to.equal(false);
      expect(result.storageEnabled).to.equal(false);
      expect(result.ocrEnabled).to.equal(false);
      expect(result.anonTokensPerUid).to.be.a('number');
      expect(result.freeTokensPerDay).to.be.a('number');
    });

    it('returns pro entitlements for users flagged as pro', async () => {
      firestoreStub.__seed('users/pro-user', { isPro: true });
      const wrapped = test.wrap(myFunctions.getEntitlement);
      const result = await wrapped({
        data: {},
        auth: { uid: 'pro-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.tier).to.equal('pro');
      expect(result.isPro).to.equal(true);
      expect(result.storageEnabled).to.equal(true);
      expect(result.ocrEnabled).to.equal(true);
    });

    it('returns anonymous tier for anonymous auth without pro flag', async () => {
      const wrapped = test.wrap(myFunctions.getEntitlement);
      const result = await wrapped({
        data: {},
        auth: { uid: 'anon-user', token: { firebase: { sign_in_provider: 'anonymous' } } },
      });

      expect(result.tier).to.equal('anonymous');
      expect(result.isPro).to.equal(false);
      expect(result.storageEnabled).to.equal(false);
      expect(result.ocrEnabled).to.equal(false);
    });
  });

  describe('analyzeText token gating', () => {
    it('returns FREE_TOKEN_LIMIT for free users above daily token threshold', async () => {
      const wrapped = test.wrap(myFunctions.analyzeText);
      const result = await wrapped({
        data: {
          docHash: 'e'.repeat(64),
          stats: { totalChars: 200000 }, // 50,000 estimated tokens > 40,000 daily free cap
          text: { value: 'x'.repeat(1000) },
        },
        auth: { uid: 'free-token-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.ok).to.equal(false);
      expect(result.code).to.equal('FREE_TOKEN_LIMIT');
      expect(result.requiredTier).to.equal('pro');
      expect(result.usage.estimatedTokens).to.equal(50000);
    });

    it('returns ANON_TOKEN_LIMIT for anonymous users above lifetime anon threshold', async () => {
      const wrapped = test.wrap(myFunctions.analyzeText);
      const result = await wrapped({
        data: {
          docHash: 'f'.repeat(64),
          stats: { totalChars: 100000 }, // 25,000 estimated tokens > 20,000 anon cap
          text: { value: 'x'.repeat(1000) },
        },
        auth: { uid: 'anon-token-user', token: { firebase: { sign_in_provider: 'anonymous' } } },
      });

      expect(result.ok).to.equal(false);
      expect(result.code).to.equal('ANON_TOKEN_LIMIT');
      expect(result.requiredTier).to.equal('free');
      expect(result.usage.estimatedTokens).to.equal(25000);
    });

    it('allows pro users past free token thresholds', async () => {
      firestoreStub.__seed('users/pro-analysis-user', { isPro: true });
      const wrapped = test.wrap(myFunctions.analyzeText);
      const result = await wrapped({
        data: {
          docHash: 'a1'.repeat(32),
          stats: { totalChars: 400000 }, // 100k estimated tokens, would fail for free/anon
          text: { value: 'This is a contract clause.' },
        },
        auth: { uid: 'pro-analysis-user', token: { firebase: { sign_in_provider: 'password' } } },
      });

      expect(result.ok).to.equal(true);
      expect(result.entitlement.tier).to.equal('pro');
      expect(result.usage.estimatedTokens).to.equal(100000);
      expect(result.usage.remainingTokens).to.equal(null);
    });
  });
});
