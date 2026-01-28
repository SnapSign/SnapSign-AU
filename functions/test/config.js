// Test configuration
module.exports = {
  projectId: 'snapsign-au-test',
  emulatorHost: 'localhost',
  emulatorPort: 8080,
  functionsEmulatorPort: 5001,
  // Configuration values that match the production config
  config: {
    FREE_AI_CALLS_PER_DOC: 1,
    PRO_AI_CALLS_PER_DOC: 3,
    MIN_CHARS_PER_PAGE: 30,
    SCAN_RATIO_THRESHOLD: 0.20,
    FREE_MAX_TOTAL_CHARS: 120000,
    TTL_DAYS_USAGE_DOCS: 30
  }
};