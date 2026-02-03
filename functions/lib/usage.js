const index = require('..');

module.exports = {
  enforceAndRecordTokenUsage: index.enforceAndRecordTokenUsage || (() => { throw new Error('enforceAndRecordTokenUsage not implemented'); }),
  estimateTokensFromChars: index.estimateTokensFromChars || ((n) => Math.max(0, Math.floor((n||0)/4))),
};
