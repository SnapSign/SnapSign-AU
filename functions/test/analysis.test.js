const chai = require('chai');
const sinon = require('sinon');
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const expect = chai.expect;

// Mock dependencies
const geminiClient = require('../lib/gemini-client');

describe('AI Analysis Functions', () => {
    let myFunctions;
    // Load functions
    console.log('Current directory:', process.cwd());
    try {
        // Clear firebase-admin from cache to ensure we mock the one index.js uses
        const adminPath = require.resolve('firebase-admin');
        delete require.cache[adminPath];
        // Re-require admin to stub it freshly
        const admin = require('firebase-admin');

        // Re-apply stubs to this fresh instance
        adminInitStub = sinon.stub(admin, 'initializeApp');
        const firestoreStub = sinon.stub(admin, 'firestore').returns({
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

        console.log('Requiring ../index');
        const indexPath = require.resolve('../index');
        delete require.cache[indexPath];
        myFunctions = require('../index');
        console.log('Loaded ../index');
    } catch (e) {
        console.error('Error requiring ../index:', e);
        throw e;
    }


    after(() => {
        test.cleanup();
        // adminInitStub.restore();
        geminiStub.restore();
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
            expect(geminiStub.calledOnce).to.be.true;
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
                expect(e.message).to.contain('invalid-argument');
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

            // Mock document classification
            /* 
               analyzeByType calls doc_classifications and doc_type_overrides.
               We need to update the firestoreStub in the 'before' block to handle this 
               if we want to test the full flow, or verify what we can here.
               Since usage of 'admin' is mocked globally, we rely on the stub provided in 'before'.
               Current stub returns empty objects mostly, let's see if we can get by or if we need to improve the stub.
               The current stub returns { exists: true, data: () => ({ isPro: true }) }.
               So effectiveTypeId might be null, but the function should still proceed with 'document' type.
            */

            const req = {
                data: {
                    docHash: 'a'.repeat(64),
                    text: 'Document content'
                },
                auth: { uid: 'test-uid' }
            };

            const wrapped = test.wrap(myFunctions.analyzeByType);
            const result = await wrapped(req);

            // It might fail if validationSpec lookup fails hard, but checking index.js it swallows errors.
            // Let's assume it proceeds.
            expect(result.ok).to.be.true;
            // The result structure from AnalyzeByType puts Gemini result in `result` field
            expect(result.result.plainExplanation).to.equal("Type analysis");

            // Verify that the prompt included MDX content
            const callArgs = modelStub.generateContent.firstCall.args[0];
            expect(callArgs).to.contain('Risk Analysis'); // From GENERAL_DOC_TYPE or specific type
            expect(callArgs).to.contain('Validation Checks');
        });
    });
});
