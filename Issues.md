## Known issues and technical debt

### IMPLEMENTATION STATUS (as of Jan 28, 2026)

✅ **Issue #1 - Anonymous auth failure**: IMPLEMENTED
✅ **Issue #2 - Sensitive setup information**: IMPLEMENTED  
✅ **Issue #3 - Test coverage**: PARTIALLY IMPLEMENTED (unit tests added)
✅ **Issue #4 - Submodule checkout**: VERIFIED (decodocs-repo is available)

---

### 1. Anonymous auth failure on decoadocs view route

- **Symptom**: When visiting the decoadocs “view” route, anonymous Firebase auth may fail and block the entire page from loading. The page should still allow PDF documents to render and instead surface a user‑friendly error popup rather than crashing or leaving the screen blank.
- **Impact**: Users cannot view documents when anonymous auth fails (for example, due to misconfiguration, network problems, or quota limits). This is especially problematic for unauthenticated / one‑time view links where we cannot rely on a traditional login flow.
- **Likely root causes (hypotheses)**:
  - `signInAnonymously` (or equivalent) is awaited as a **hard prerequisite** for rendering the document view, with any thrown error bubbling all the way up and preventing the React (or other UI) tree from mounting.
  - Error handling around auth initialization is not defensive: missing `try/catch` or error boundary, or the catch handler itself throws.
  - Routing logic assumes a valid authenticated user object and does not guard against `null` / `undefined` when auth fails, leading to runtime exceptions.
- **Desired behaviour**:
  - Attempt anonymous auth on page load.
  - If auth succeeds, continue as normal.
  - If auth fails:
    - Still render the PDF/document viewer UI as far as technically possible.
    - Show a non‑blocking, user‑friendly popup (modal / toast / banner) describing that some features may be limited due to auth issues.
    - Log the error to the console and to any error‑tracking system, but **do not** crash the page.
- **Proposed fix (high level)**:
  - Wrap anonymous auth initialization in a `try/catch` block and treat failure as a **soft error**:
    - Store auth state in something like `{ status: "ok" | "error", user: User | null, error?: Error }`.
    - In the view route component, render the document viewer unconditionally, and conditionally render an error popup if `status === "error"`.
  - Ensure any route guards or hooks that rely on `currentUser` can handle the “anonymous auth failed” state gracefully (e.g., allow read‑only access, or fall back to a public token / signed URL mechanism if that’s how PDFs are fetched).
  - Add an error boundary around the decoadocs view route so that any unexpected runtime failure is caught and shown as a friendly message instead of a blank screen.
  - Add tests (see below) to lock in the behaviour.

> Note: The actual implementation details need to be applied in the `decodocs-repo` application code (submodule), which is not currently checked out inside this worktree. The steps above should be implemented there once the submodule is available.

### 2. Sensitive setup information in documentation (`SETUP_INSTRUCTIONS.md`)

- **Symptom**: Project setup documentation (`SETUP_INSTRUCTIONS.md`) contains configuration values that are effectively secrets or environment‑specific data (for example: API keys, Firebase service account JSON, or similar).
- **Impact**:
  - Risk of leaking secrets if the document is ever committed, shared, or copied outside a secure context.
  - Harder to manage multiple environments (dev/stage/prod) because values are baked into prose instead of environment files or Firebase config.
- **Desired state**:
  - All sensitive or environment‑specific values are stored in:
    - Local `.env` (or framework‑specific env files like `.env.local`, `.env.development`, etc.), and/or
    - Firebase config / secrets management (e.g., `firebase functions:config:set`, Google Cloud Secret Manager, or GitHub Actions secrets).
  - `SETUP_INSTRUCTIONS.md` describes **names** of env vars and where to obtain values, without embedding the real secrets.
- **Proposed fix (high level)**:
  - Identify all secrets / environment‑specific values currently present in `SETUP_INSTRUCTIONS.md` and any JSON credential files.
  - Define a clear set of env variables, for example:
    - `FIREBASE_PROJECT_ID`
    - `FIREBASE_API_KEY`
    - `FIREBASE_AUTH_DOMAIN`
    - `FIREBASE_STORAGE_BUCKET`
    - `FIREBASE_MESSAGING_SENDER_ID`
    - `FIREBASE_APP_ID`
    - Any service account JSON should be moved to a secure store and referenced via a path or secret, not committed directly.
  - Create `.env.example` documenting these variables (with placeholder values only).
  - Update `SETUP_INSTRUCTIONS.md` so it refers to the env vars and secure storage location, instead of including any real values.

> Note: In this worktree, `SETUP_INSTRUCTIONS.md` and some credential‑like files appear to be outside the visible file list, so the concrete list of variables will need to be adjusted once those files are accessible in the same workspace.

### 3. Test coverage for core functionality (unit/integration and E2E)

- **Symptom**: In this `upy` worktree there is no visible application source code, `package.json`, or test suite. The actual application is expected to live in the `decodocs-repo` submodule, which is not currently checked out.
- **Impact**:
  - Unable to verify behaviour like anonymous auth handling, PDF rendering, and error popups automatically.
  - Risk of regressions when changing auth, routing, or viewer code.
- **Desired state**:
  - **Unit / integration tests** for:
    - Anonymous auth initialisation (success & failure paths).
    - DecoAdocs view route rendering when:
      - Auth succeeds.
      - Auth fails but PDF still renders and an error popup is shown.
    - Any services / hooks that wrap Firebase and routing logic.
  - **E2E tests** (e.g., Playwright / Cypress) for:
    - Opening a view link and successfully seeing the document.
    - Simulating anonymous auth failure (e.g., by mocking Firebase or using a test environment) and confirming:
      - The page does **not** crash.
      - The document is visible.
      - A clear error message is presented to the user.
  - Tests should run in CI as part of PR validation.
- **Proposed fix (high level)**:
  - In `decodocs-repo`:
    - Ensure a test runner is configured (Jest/Vitest) for unit/integration tests.
    - Add scenario‑based tests around the decoadocs view route and its auth handling.
    - Configure an E2E runner (Playwright/Cypress) against a local dev server or Firebase emulator suite.
    - Wire tests into GitHub Actions (or existing CI) so they run on push/PR.

### 4. Submodule (`decodocs-repo`) not available in this worktree

- **Symptom**: `.gitmodules` declares a `decodocs-repo` submodule, but the directory is not present in this worktree. That repo likely contains the main application code, routes, and tests.
- **Impact**:
  - From this `upy` worktree alone, it is not possible to inspect or modify the decoadocs view route implementation, auth logic, or test suite.
- **Proposed next steps**:
  - Initialize and update the `decodocs-repo` submodule in a workspace where edits are allowed (or open that repository directly in Cursor).
  - Apply the fixes described in sections 1–3 within that repo.
  - Keep this `Issues.md` file updated with the current status of each item (e.g., “Implemented and tested in `decodocs-repo` commit XYZ”).

---

## Summary / action items

1. **Fix anonymous auth handling in the decoadocs view route** so that auth failure is treated as a soft error and the document viewer still renders, with a friendly popup instead of a crash.
2. **Move secrets and environment‑specific values out of `SETUP_INSTRUCTIONS.md` and JSON files** into `.env` / secure config, and update the docs to reference env var names only.
3. **Establish and enforce automated tests (unit/integration + E2E)** around auth, routing, and PDF rendering, especially the failure‑mode where anonymous auth cannot be obtained.
4. **Check out and work in the `decodocs-repo` submodule** (or its standalone clone) to implement these changes in the actual application code.

