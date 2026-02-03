const index = require('..');

module.exports = {
  validateAuth: index.validateAuth || index.validateAuth || ((context) => { throw new Error('validateAuth not implemented'); }),
  getUserEntitlement: index.getUserEntitlement || ((context) => { throw new Error('getUserEntitlement not implemented'); }),
  resolvePuidForUid: index.resolvePuidForUid || ((uid) => uid),
};
