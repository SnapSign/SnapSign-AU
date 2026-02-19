# AGENTS.md - SnapSign-AU Deployment Repo + Nested DecoDocs Policy

## Repo structure (important)
- This repository is the **Firebase deployment/hosting umbrella** for the `snapsign-au` Firebase project (hosting + functions + rules).
- `Decodocs/` is a **nested, independent git repository** (it contains its own `.git/`).
- DecoDocs must remain physically nested under this repo so Firebase Hosting can deploy static outputs from `Decodocs/web/decodocs.com/` and `Decodocs/admin/dist/`.
- Note: `firebase.json` currently uses lowercase `decodocs/...` paths; the actual folder in this repo is `Decodocs/` (capital D).

**Rule:** Do not vendor/copy DecoDocs into SnapSign-AU history. Keep it as its own repo.

## Hosting targets (per firebase.json)
Firebase Hosting targets in `firebase.json` and their public directories are:

1) `site: "snapsign-au"` → `snapsign.com.au/` (intended domain: **snapsign.com.au**)

2) `site: "decodocs-site"` → `Decodocs/web/decodocs.com/` (intended domain: **decodocs.com**)

3) `site: "decodocs-admin"` → `Decodocs/admin/dist/` (domain not defined in repo; check Firebase Console)

## Hosting/Functions Requirements
- **Use only simple (static or SPA) Firebase Hosting and basic gen2 Functions for all subprojects.**
- Do NOT use Advanced Hosting (SSR, Next.js app hosting, preview channels, or Cloud Build triggers).
- Do NOT configure 'webframeworks', SSR, or 'app hosting' in firebase.json or any deployment script in any subproject.
- Hosting must always point to the built static site output (`dist/` or similar) and never require a dynamic build server.
- Functions must be simple, not depend on advanced triggers, and reside in a single functions directory for API/utility use only.
- The deployment workflow must permit Spark (free) or Blaze (pay-as-you-go) plans, but never require advanced/locked vendor-specific features.

## Enforcement
- Any PR or major commit that adds advanced hosting, SSR, or Cloud Build triggers must be rejected unless accompanied by justification and prior review.

---

## Canonical deployment script
- The canonical, repo-root deployment entrypoint is `./test-build-deploy.sh`. Use this script to run tests, build all subprojects, verify outputs, and deploy Firebase targets from the repository root.
- Typical usage: `./test-build-deploy.sh` (options: `--skip-install`, `--skip-build`, `--skip-tests`, `--skip-deploy`, `--bump <patch|minor|major>`, `--project <id>`, `--only <targets>`).
- CI pipelines and operators MUST prefer `test-build-deploy.sh` over ad-hoc `firebase deploy` or per-subproject deploys to ensure consistent, verified builds and hosting paths.
- Local per-subproject `npm run build` is acceptable for development, but production/integration deploys must use `test-build-deploy.sh`.

If a deployment ever requests Blaze/Cloud Build/Artifact Registry for basic static hosting, review firebase.json and eliminate non-static or SSR/Next.js features. Cloud Build and Artifact Registry must remain disabled unless absolutely necessary for a critical feature.

## Admin config helpers and paths
- `functions/index.js` exposes two admin/debug HTTP helpers:
  - `getDocByPath` (read a Firestore document by `qpath`)
  - `setDocByPath` (write a Firestore document by `qpath`, `admin/*` only)
- These helpers operate on Firestore **document paths** (even segment count), not field paths.
- Gemini API key source of truth in Firestore is:
  - document: `admin/gemini`
  - field: `key`
  - logical field path notation: `/admin/gemini/key`
- Example write payload:
  - `POST /setDocByPath` with `{ "qpath": "admin/gemini", "data": { "key": "AIza..." } }`

## Environment Policy (Required)
- Do not create or rely on `.env*` files (`.env`, `.env.local`, `.env.production`, etc.) in this repo.
- Do not add dotenv loaders to scripts, functions, web, or admin apps.
- Allowed config sources:
  - Firestore admin config documents (preferred for product/runtime config), and
  - platform-provided process environment (CI/Firebase runtime/shell), without local env files.

## Documentation & project context
- Both code changes and copywriting (docs, UI text, marketing copy) require project-level understanding. Before making non-trivial technical or content changes, consult `DOCS_INDEX.md` for the curated entry points, architecture overviews, runbooks, and owner contacts.
- Use the index to find the canonical doc for the area you are changing and to identify the right owner(s) to review copy or implementation updates.
