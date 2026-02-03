const index = require('..');

module.exports = {
  analyzeText: index.analyzeText || ((data, context) => { throw new Error('analyzeText not implemented'); }),
  analyzeByType: index.analyzeByType || ((data, context) => { throw new Error('analyzeByType not implemented'); }),
  loadDocTypeState: async (puid, docHash) => {
    // Forward to index.getDocumentTypeState as a compatibility helper
    if (typeof index.getDocumentTypeState === 'function') {
      const resp = await index.getDocumentTypeState({ docHash }, { auth: { uid: puid } });
      return { overrideTypeId: resp.overrideTypeId, detectedTypeId: resp.detectedTypeId, effectiveTypeId: resp.effectiveTypeId };
    }
    return { overrideTypeId: null, detectedTypeId: null, effectiveTypeId: null };
  },
  buildBudgetDeniedResponse: (tier, budget, estimatedTokens) => ({ ok: false, code: budget?.code || 'BUDGET_DENIED', message: 'Budget denied', tier, estimatedTokens, remaining: budget?.remaining || 0 }),
};
