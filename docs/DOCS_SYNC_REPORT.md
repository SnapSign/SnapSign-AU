<!-- working: docs/code synchronization notes -->

# Docs Sync Report (Working)

Date: 2026-02-22

Goal: reduce drift between the current repo behavior and the canonical runbooks/docs.

## High-impact fixes applied

### Root (umbrella repo)
- `AGENTS.md`: corrected note about `firebase.json` path casing (it should match on-disk `Decodocs/`).
- `SETUP_INSTRUCTIONS.md`: updated to the actual config model:
  - no `.env*` files (process env is allowed, but no env files)
  - secrets live in Firestore `admin/*` docs (not generic `config/secrets`)
  - deploy via `./test-build-deploy.sh` (manual deploy is fallback)

### DecoDocs canonical docs
- `Decodocs/AGENTS.md`: corrected nested path + build output directory.
- `Decodocs/docs/DEPLOYMENT.md`: rewritten to match current repo layout and canonical deploy workflow.
- `Decodocs/docs/TESTING.md`: updated Playwright behavior/env flags and documented the real-Firebase smoke test.
- `Decodocs/docs/DEVELOPMENT.md`: removed emulator-first instructions, corrected paths, Node version, and E2E flags.
- `Decodocs/docs/STRIPE.md` + `Decodocs/docs/AUTH_EMAIL_PASSWORD.md`: removed “prefer emulators” guidance; aligned to mock-mode policy.
- `ARCHITECTURE_AND_DATA_FLOW.md`: updated feature status and default Gemini model references.

## Remaining mismatches / decisions needed

These require an explicit “source of truth” decision (docs vs code) before updating:

1) **Storage spec wording**
   - `Decodocs/docs/FEATURES.md` still says “Storage: Firebase Storage (planned)”.
   - Current implementation uses S3/MinIO (see `functions/index.js` + `Decodocs/docs/DEPLOYMENT.md`).
   - Decision needed: keep “planned” wording or update to “S3/MinIO (current)”.

2) **Test strategy scope**
   - `Decodocs/web/AGENTS.md` says client tests should exercise real deployed Functions.
   - Today: most Playwright specs use `window.MOCK_AUTH` and/or route interception; one opt-in smoke spec hits real Firebase:
     - `Decodocs/web/playwright-tests-real/ai-workflow-firebase.spec.js`
   - Decision needed: do you want:
     - A) keep most e2e mocked + maintain a small set of real-backend smoke specs, or
     - B) move more of the e2e suite to hit real deployed Functions?

3) **Snapshot AI analysis docs**
   - Files under root like `AI_ANALYSIS_*` are marked “snapshot”.
   - Decision needed: should we update them for correctness (model names, scripts), or leave them as historical context and focus only on canonical docs?

