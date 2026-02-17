const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const test = require('firebase-functions-test')();

const expect = chai.expect;

// Mock dependencies
const geminiClient = require('../lib/gemini-client');

describe('Entitlement & Limits', () => {
    let myFunctions;
    let modelStub;
    let geminiStub;
    let firestoreStub;
    let userDocStub;
    let usageDocStub;
    let transactionStub;

    before(() => {
        // Mock Firestore
        userDocStub = {
            get: sinon.stub(),
            set: sinon.stub().resolves(),
            update: sinon.stub().resolves()
        };

        usageDocStub = {
            get: sinon.stub(),
            set: sinon.stub().resolves()
        };

        firestoreStub = sinon.stub().returns({
            collection: sinon.stub().callsFake((collectionName) => {
                if (collectionName === 'users') {
                    return {
                        doc: sinon.stub().returns(userDocStub)
                    };
                }
                if (collectionName === 'usage_daily') {
                    return {
                        doc: sinon.stub().returns(usageDocStub)
                    };
                }
                // Fallback for other collections (e.g. doc_classifications)
                return {
                    doc: sinon.stub().returns({
                        get: sinon.stub().resolves({ exists: false }),
                        set: sinon.stub().resolves(),
                        update: sinon.stub().resolves()
                    }),
                    add: sinon.stub().resolves()
                };
            }),
            runTransaction: sinon.stub(),
            // Mock FieldValue

        });

        firestoreStub.FieldValue = {
            serverTimestamp: sinon.stub().returns('MOCK_TIMESTAMP'),
            increment: sinon.stub().callsFake((val) => `INCREMENT_${val}`)
        };

        // Mock Admin SDK
        const adminStub = {
            initializeApp: sinon.stub(),
            firestore: firestoreStub,
            apps: [],
            credential: {
                cert: sinon.stub()
            },
            '@global': true
        };

        // Mock Gemini client (so we don't make real calls)
        modelStub = {
            generateContent: sinon.stub().resolves({
                response: {
                    text: () => JSON.stringify({ plainExplanation: "Success", risks: [] })
                }
            })
        };
        geminiStub = sinon.stub(geminiClient, 'getGeminiModel').returns(modelStub);

        // Load functions
        myFunctions = proxyquire('../index', {
            'firebase-admin': adminStub,
            './lib/gemini-client': geminiClient
        });

        // Force reload of internal modules if needed (entitlement is required by index)
    });

    after(() => {
        test.cleanup();
        if (geminiStub.restore) geminiStub.restore();
        sinon.restore();
    });

    beforeEach(() => {
        // Reset stubs
        userDocStub.get.reset();
        userDocStub.set.reset();
        usageDocStub.get.reset();
        usageDocStub.set.reset();
        firestoreStub().runTransaction.reset();
        modelStub.generateContent.resetHistory();
    });

    // Helper to create request
    const createRequest = (data, uid, isAnonymous = false) => ({
        data,
        auth: {
            uid,
            token: {
                firebase: { sign_in_provider: isAnonymous ? 'anonymous' : 'password' }
            }
        }
    });

    // Config constants from index.js (replicated for testing expectations)
    const ANON_TOKENS_PER_UID = 20000;
    const FREE_TOKENS_PER_DAY = 40000;

    describe('Anonymous Tier', () => {
        it('should allow request if usage is within limits', async () => {
            const uid = 'anon-user-1';
            // used = 10000, requesting ~25 tokens (100 chars). 10000 + 25 < 20000.
            userDocStub.get.resolves({
                exists: true,
                data: () => ({
                    isPro: false,
                    usage: { anonTokensUsed: 10000 }
                })
            });

            const req = createRequest({
                docHash: 'a'.repeat(64),
                text: { value: 'a'.repeat(100) },
                stats: { totalChars: 100 }
            }, uid, true);

            const wrapped = test.wrap(myFunctions.analyzeText);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            // Verify usage incremented
            expect(userDocStub.set.calledOnce).to.be.true;
            const args = userDocStub.set.firstCall.args[0];
            expect(args.usage.anonTokensUsed).to.equal('INCREMENT_25'); // 100 chars / 4 = 25 tokens
        });

        it('should block request if usage exceeds limits', async () => {
            const uid = 'anon-user-2';
            // used = 19990, requesting ~25 tokens (100 chars). 19990 + 25 = 20015 > 20000.
            userDocStub.get.resolves({
                exists: true,
                data: () => ({
                    isPro: false,
                    usage: { anonTokensUsed: 19990 }
                })
            });

            const req = createRequest({
                docHash: 'a'.repeat(64),
                text: { value: 'a'.repeat(100) },
                stats: { totalChars: 100 }
            }, uid, true);

            const wrapped = test.wrap(myFunctions.analyzeText);
            const result = await wrapped(req); // analyzeText returns { ok: false } on limit, doesn't throw HttpsError for limits usually?
            // Wait, checking index.js:
            /*
              if (!budget.allowed) {
                return { ok: false, code: ... }
              }
            */
            expect(result.ok).to.be.false;
            expect(result.code).to.equal('ANON_TOKEN_LIMIT');
            expect(userDocStub.set.called).to.be.false; // No increment
        });
    });

    describe('Free Tier', () => {
        it('should allow request if daily usage is within limits', async () => {
            const uid = 'free-user-1';
            // User doc exists, not pro
            userDocStub.get.resolves({
                exists: true,
                data: () => ({ isPro: false })
            });

            // Transaction mock for daily usage check
            firestoreStub().runTransaction.callsFake(async (updateFunction) => {
                // Mock transaction context
                const tx = {
                    get: sinon.stub().resolves({
                        exists: true,
                        data: () => ({ tokensUsed: 10000 })
                    }),
                    set: sinon.stub()
                };
                await updateFunction(tx);
                // Verify tx.set was called
                if (tx.set.called) {
                    const args = tx.set.firstCall.args[1];
                    expect(args.tokensUsed).to.equal('INCREMENT_25');
                } else {
                    // If set not called, means it logic thought over limit? 
                    // But 10000 < 40000.
                }
            });

            const req = createRequest({
                docHash: 'a'.repeat(64),
                text: { value: 'a'.repeat(100) },
                stats: { totalChars: 100 }
            }, uid, false);

            const wrapped = test.wrap(myFunctions.analyzeText);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            expect(firestoreStub().runTransaction.calledOnce).to.be.true;
        });

        it('should block request if daily usage exceeds limits', async () => {
            const uid = 'free-user-2';
            userDocStub.get.resolves({
                exists: true,
                data: () => ({ isPro: false })
            });

            // Transaction mock where usage is high
            firestoreStub().runTransaction.callsFake(async (updateFunction) => {
                const tx = {
                    get: sinon.stub().resolves({
                        exists: true,
                        data: () => ({ tokensUsed: 39990 })
                    }),
                    set: sinon.stub()
                };
                await updateFunction(tx);
                // It should verify logic inside transaction but analyzeText also checks 'used + estimated' after transaction or inside?
                // Logic in index.js:
                /*
                  await db.runTransaction(...)
                  if (used + estimatedTokens > CONFIG.FREE_TOKENS_PER_DAY) return { allowed: false ... }
                */
                // The transaction sets 'used' var in parent scope. 
                // Wait, my test can't easily capture the local 'used' variable in index.js. 
                // But runTransaction calls the callback. We need to ensure the callback behaving like real Firestore updates 'used' if we were using real DB.
                // In index.js:
                /*
                  let used = 0;
                  await db.runTransaction(async (tx) => {
                    const doc = await tx.get(ref);
                    used = doc.exists ? ... : 0;
                    ...
                  });
                */
                // Ah, the transaction function updates the closure variable `used`.
                // So my mock transaction must execute the callback.
            });

            const req = createRequest({
                docHash: 'a'.repeat(64),
                text: { value: 'a'.repeat(100) },
                stats: { totalChars: 100 }
            }, uid, false);

            // To make this fail, I need the 'used' variable in index.js to be updated. 
            // Since it comes from `doc.data().tokensUsed` inside the transaction, 
            // and I mock `tx.get` to return high usage, it should updates `used` to 39990. 
            // 39990 + 25 = 40015 > 40000.

            const wrapped = test.wrap(myFunctions.analyzeText);
            const result = await wrapped(req);

            expect(result.ok).to.be.false;
            expect(result.code).to.equal('FREE_TOKEN_LIMIT');
        });
    });

    describe('Pro Tier', () => {
        it('should bypass limits for Pro users', async () => {
            const uid = 'pro-user-1';
            userDocStub.get.resolves({
                exists: true,
                data: () => ({ isPro: true })
            });

            const req = createRequest({
                docHash: 'a'.repeat(64),
                text: { value: 'a'.repeat(100) },
                stats: { totalChars: 100 }
            }, uid, false);

            const wrapped = test.wrap(myFunctions.analyzeText);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            // Should NOT check daily usage or anonymous usage
            expect(usageDocStub.get.called).to.be.false;
            // Actually usageDocStub is used inside runTransaction if it were called.
            expect(firestoreStub().runTransaction.called).to.be.false;
            // Should verify it just resets lastSeeenAt maybe? 
            // In getUserEntitlement it does: await userRef.set({ lastSeenAt... }, { merge: true })
            // So userDocStub.set might be called once for that.
            expect(userDocStub.set.called).to.be.true;
        });
    });
});
