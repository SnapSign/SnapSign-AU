# SnapSign-AU Umbrella Repository

Deployment umbrella for Firebase project `snapsign-au`:
- Hosting for `snapsign.com.au`
- Hosting for `decodocs.com` static output
- Hosting for DecoDocs admin static output
- Shared Cloud Functions + Firestore rules/indexes

`Decodocs/` is a nested independent git repository and must remain separate.

## Repository Map

- `firebase.json` - hosting/functions/rules wiring
- `functions/` - shared gen2 Functions runtime
- `snapsign.com.au/` - SnapSign marketing/site app
- `Decodocs/web/` - DecoDocs web app source (build output: `Decodocs/web/decodocs.com/`)
- `Decodocs/admin/` - DecoDocs admin app (build output: `Decodocs/admin/dist/`)
- `Decodocs/docs/` - canonical DecoDocs product/technical docs

## Hosting Targets

Defined in `firebase.json`:
1. `snapsign-au` -> `snapsign.com.au/dist`
2. `decodocs-site` -> `Decodocs/web/decodocs.com`
3. `decodocs-admin` -> `Decodocs/admin/dist`

## Documentation

- Documentation system and ownership: `docs/README.md`
- Curated index of docs: `DOCS_INDEX.md`
- DecoDocs docs entrypoint: `Decodocs/docs/README.md`
- DecoDocs nested repo overview: `Decodocs/README.md`

## Development Quick Start

Prerequisites:
- Node.js 22+ (functions engine is Node 22)
- npm
- Firebase CLI

Install deps:
```bash
npm --prefix snapsign.com.au ci
npm --prefix Decodocs/web ci
npm --prefix Decodocs/admin ci
npm --prefix functions ci
```

Local app dev (typical):
```bash
npm --prefix Decodocs/web run dev
npm --prefix Decodocs/admin run dev
npm --prefix snapsign.com.au run dev
firebase emulators:start
```

## Build And Deploy

Primary workflow:
```bash
./build-and-deploy.sh
```

Common alternatives:
```bash
./build-and-deploy.sh --skip-deploy
./build-and-deploy.sh --skip-install --skip-build
./build-and-deploy.sh --only hosting
```

Manual fallback:
```bash
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

## Platform Constraints

This repository intentionally uses simple static hosting + basic functions:
- No SSR/App Hosting/webframework auto-hosting
- No Cloud Build-triggered advanced hosting flows
- Hosting always points at built static directories
- Functions remain in a single shared `functions/` directory

## Config Policy (No `.env*` Files)

- `.env`, `.env.local`, `.env.production`, and similar env files are not used in this repository.
- Do not introduce dotenv loaders or `.env*`-based workflows in code, scripts, or docs.
- Runtime configuration must come from:
  - Firebase/Firestore admin config documents, or
  - standard process environment provided by the execution platform (CI, Firebase runtime, shell), without local env files.

See `AGENTS.md` for enforcement details and policy rationale.
