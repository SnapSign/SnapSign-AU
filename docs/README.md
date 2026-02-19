# Documentation System (Root Repo)

This file defines how documentation is organized in this repository so docs stay clear, current, and non-duplicated.

## Goals

- One obvious source of truth per topic.
- Minimal duplication between root repo and nested `Decodocs/`.
- Predictable placement for new docs.
- Explicit lifecycle for working notes and legacy snapshots.

## Document Classes

Use one of these classes for each doc:

- `canonical`: authoritative reference for an ongoing topic.
- `runbook`: operational procedures (deploy, incident, setup).
- `working`: temporary planning/checklist notes tied to active work.
- `snapshot`: historical point-in-time analysis; not auto-updated.

## Canonical Sources (Root)

- Repo overview + bootstrap:
  - `README.md`
- Documentation map:
  - `DOCS_INDEX.md`
  - `docs/README.md` (this file)
- Firebase/deployment topology:
  - `firebase.json`
  - `AGENTS.md`
- Shared functions behavior:
  - `functions/index.js`
  - `functions/test/README.md` (test runbook)

## Canonical Sources (DecoDocs Nested Repo)

- Product/tech docs index:
  - `Decodocs/docs/README.md`
- Product definition:
  - `Decodocs/docs/PRODUCT.md`
- Current status:
  - `Decodocs/docs/STATUS_SUMMARY.md`
- Architecture/API/deployment:
  - `Decodocs/docs/ARCHITECTURE.md`
  - `Decodocs/docs/API.md`
  - `Decodocs/docs/DEPLOYMENT.md`

## Working And Snapshot Docs

Treat the following as non-canonical unless promoted:

- `TASKS.md`, `Issues.md`, `Decodocs/TODO.md`, `Decodocs/admin/TODO.md` -> `working`
- `README_AI_ANALYSIS_DOCS.md`, `AI_ANALYSIS_*`, `PHASE_1_1_TEMPLATE.md`, `docs/MASTERMIND.md` -> `snapshot`

If snapshot content becomes active policy/spec behavior, merge it into canonical docs and keep the snapshot as archive context only.

## Placement Rules For New Docs

- Put root-platform and Firebase umbrella docs at repository root or `docs/`.
- Put DecoDocs product docs in `Decodocs/docs/`.
- Put app-specific runbooks in each app folder (`Decodocs/web/`, `Decodocs/admin/`, `functions/`).
- Do not create duplicate “overview/setup/deploy” docs when a canonical file already exists; update the canonical file instead.

## Consolidation Targets

- AI-analysis planning docs should converge into:
  - canonical behavior/spec in `docs/FUNCTIONS_IMPLEMENTATION.md` and `Decodocs/docs/API.md`
  - active tasks in `TASKS.md` or `Decodocs/TODO.md`
  - historical context retained in snapshot files
- Cross-project setup/deploy guidance belongs in `README.md` + app-specific READMEs, not duplicated across unrelated files.

## Maintenance Checklist

When updating docs:
1. Update canonical file first.
2. Update `DOCS_INDEX.md` if entrypoints changed.
3. Add/update links from impacted app README.
4. If a working/snapshot file is obsolete, mark it clearly as archived context or remove it in a dedicated cleanup PR.
