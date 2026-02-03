const index = require('..');

// Forwarding stubs for error utilities (index may implement error handling already)
module.exports = {
  AppError: index.AppError || class AppError extends Error {},
  translateError: index.translateError || ((err) => err),
  withCallable: index.withCallable || ((handler) => handler),
};
