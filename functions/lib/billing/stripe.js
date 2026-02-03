const index = require('..');

module.exports = {
  getStripeClient: index.getStripeClient || (() => { throw new Error('getStripeClient not implemented'); }),
  getStripeAdminConfig: index.getStripeAdminConfig || (() => { throw new Error('getStripeAdminConfig not implemented'); }),
  upsertStripeSubscriptionState: index.upsertStripeSubscriptionState || (() => { throw new Error('upsertStripeSubscriptionState not implemented'); }),
};
