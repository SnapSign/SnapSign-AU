const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const test = require('firebase-functions-test')();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const expect = chai.expect;

// Mock dependencies
const geminiClient = require('../lib/gemini-client');

describe('AI Analysis Functions', () => {
    let myFunctions;
    let modelStub;
    let geminiStub;

    before(() => {
        // Mock Firestore calls for admin
        const firestoreStub = sinon.stub().returns({
            collection: sinon.stub().returns({
                doc: sinon.stub().returns({
                    get: sinon.stub().resolves({ exists: true, data: () => ({ isPro: true }) }),
                    set: sinon.stub().resolves(),
                    add: sinon.stub().resolves()
                }),
                add: sinon.stub().resolves()
            }),
            runTransaction: sinon.stub().resolves()
        });

        // Mock FieldValue (needed for serverTimestamp)
        firestoreStub.FieldValue = {
            serverTimestamp: sinon.stub().returns('MOCK_TIMESTAMP')
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

        // Mock Gemini client
        modelStub = {
            generateContent: sinon.stub()
        };
        geminiStub = sinon.stub(geminiClient, 'getGeminiModel').returns(modelStub);

        myFunctions = proxyquire('../index', {
            'firebase-admin': adminStub,
            './lib/gemini-client': geminiClient
        });

        // Force reload of prompts to pick up MDX changes if they were cached
        try {
            const promptsPath = require.resolve('../lib/prompts');
            delete require.cache[promptsPath];
            const promptLoaderPath = require.resolve('../lib/prompt-loader');
            delete require.cache[promptLoaderPath];
        } catch (e) {
            // Ignore if not found
        }
    });

    beforeEach(() => {
        modelStub.generateContent.resetHistory();
        geminiStub.resetHistory();
    });

    after(() => {
        test.cleanup();
        if (geminiStub.restore) geminiStub.restore();
        sinon.restore();
    });

    describe('analyzeText', () => {
        it('should return analysis result on success', async () => {
            const mockAnalysis = {
                plainExplanation: "Test explanation",
                risks: []
            };

            modelStub.generateContent.resolves({
                response: {
                    text: () => JSON.stringify(mockAnalysis)
                }
            });

            const req = {
                data: {
                    docHash: 'a'.repeat(64),
                    text: { value: 'Test document content' },
                    stats: { totalChars: 100 }
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.analyzeText);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            expect(result.result.plainExplanation).to.equal("Test explanation");
        });

        it('should throw error if text is missing', async () => {
            const req = {
                data: {
                    docHash: 'a'.repeat(64),
                    stats: { totalChars: 100 }
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.analyzeText);

            try {
                await wrapped(req);
                expect.fail('Should have thrown an error');
            } catch (e) {
                // HttpsError has code property
                expect(e.code).to.equal('invalid-argument');
            }
        });
    });

    describe('explainSelection', () => {
        it('should return explanation on success', async () => {
            const mockExplanation = {
                plainExplanation: "Selection explained"
            };

            modelStub.generateContent.resolves({
                response: {
                    text: () => JSON.stringify(mockExplanation)
                }
            });

            const req = {
                data: {
                    docHash: 'test-hash',
                    selection: 'Legalese text',
                    documentContext: 'Context'
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.explainSelection);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            expect(result.explanation.plainExplanation).to.equal("Selection explained");
        });
    });

    describe('highlightRisks', () => {
        it('should return risks on success', async () => {
            const mockRisks = {
                summary: { totalRisks: 1, overallRiskLevel: 'medium' },
                items: [{ id: 'r1', title: 'Risk 1', severity: 'medium', description: 'Desc' }]
            };

            modelStub.generateContent.resolves({
                response: {
                    text: () => JSON.stringify(mockRisks)
                }
            });

            const req = {
                data: {
                    docHash: 'hash',
                    documentText: 'Contract text',
                    documentType: 'contract'
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.highlightRisks);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            expect(result.risks.summary.totalRisks).to.equal(1);
        });
    });

    describe('translateToPlainEnglish', () => {
        it('should return translation on success', async () => {
            const mockTranslation = {
                originalText: "Legalese",
                plainEnglishTranslation: "Simple text"
            };

            modelStub.generateContent.resolves({
                response: {
                    text: () => JSON.stringify(mockTranslation)
                }
            });

            const req = {
                data: {
                    docHash: 'hash',
                    legalText: 'Legalese'
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.translateToPlainEnglish);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            expect(result.translation.plainEnglishTranslation).to.equal("Simple text");
        });
    });

    describe('analyzeByType', () => {
        it('should return type-specific analysis on success', async () => {
            const mockTypeAnalysis = {
                plainExplanation: "Type analysis",
                extracted: [{ key: 'date', value: '2023-01-01' }],
                checks: []
            };

            modelStub.generateContent.resolves({
                response: {
                    text: () => JSON.stringify(mockTypeAnalysis)
                }
            });

            const req = {
                data: {
                    docHash: 'a'.repeat(64),
                    text: { value: 'Document content' }, // IMPORTANT: analyzeByType expects text.value
                    stats: { totalChars: 100 }
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.analyzeByType);
            const result = await wrapped(req);

            expect(result.ok).to.be.true;
            expect(result.result.plainExplanation).to.equal("Type analysis");

            // Verify that the prompt included MDX content. 
            const callArgs = modelStub.generateContent.firstCall.args[0];

            let promptText = '';
            if (typeof callArgs === 'string') {
                promptText = callArgs;
            } else if (callArgs.contents && callArgs.contents[0] && callArgs.contents[0].parts) {
                // If parts is array of objects { text: ... } or just strings?
                // google-generative-ai parts usually { text: string }
                const part = callArgs.contents[0].parts[0];
                promptText = typeof part === 'string' ? part : part.text;
            } else {
                promptText = JSON.stringify(callArgs);
            }

            expect(promptText).to.contain('Risk Analysis');
            expect(promptText).to.contain('Validation Checks');
        });
    });
});
