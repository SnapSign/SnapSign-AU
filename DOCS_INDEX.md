# Documentation Index (Curated)

This index is intentionally curated, not auto-dumped.  
It includes only Markdown documentation and groups docs by ownership/purpose.

## Repository boundaries

- Root repo (`SnapSign-AU.AU`) contains Firebase deployment/hosting + shared functions.
- `Decodocs/` is a nested independent git repo with its own product docs.

## Start here

- [`README.md`](README.md) - umbrella overview and local/deploy workflow
- [`docs/README.md`](docs/README.md) - documentation system, ownership, and lifecycle
- [`DOCS_INDEX.md`](DOCS_INDEX.md) - this curated map
- [`AGENTS.md`](AGENTS.md) - repo operating constraints
- [`Decodocs/docs/README.md`](Decodocs/docs/README.md) - canonical entry point for DecoDocs product docs

## Umbrella repo docs (SnapSign/Firebase)

- [`SETUP_INSTRUCTIONS.md`](SETUP_INSTRUCTIONS.md) - Firebase/project setup policy
- [`ARCHITECTURE_AND_DATA_FLOW.md`](ARCHITECTURE_AND_DATA_FLOW.md) - system data-flow overview
- [`TASKS.md`](TASKS.md) - cross-project execution list
- [`Issues.md`](Issues.md) - known defects and UX debt
- [`LANDING_INSTRUCTIONS.md`](LANDING_INSTRUCTIONS.md) - landing copy/structure guidance
- [`snapsign.com.au/README.md`](snapsign.com.au/README.md) - SnapSign website app
- [`functions/prompts/README.md`](functions/prompts/README.md) - prompt pack notes
- [`functions/test/README.md`](functions/test/README.md) - backend test instructions

## DecoDocs docs (nested repo)

- [`Decodocs/README.md`](Decodocs/README.md) - project-level overview
- [`Decodocs/TODO.md`](Decodocs/TODO.md) - engineering TODO tracker
- [`Decodocs/docs/README.md`](Decodocs/docs/README.md) - full product/architecture/api/deploy map
- [`Decodocs/docs/validation/README.md`](Decodocs/docs/validation/README.md) - validation doc-type specs
- [`Decodocs/web/README.md`](Decodocs/web/README.md) - web app setup and runbook
- [`Decodocs/web/TEST_PLAN.md`](Decodocs/web/TEST_PLAN.md) - web test plan
- [`Decodocs/admin/README.md`](Decodocs/admin/README.md) - admin app usage
- [`Decodocs/admin/TODO.md`](Decodocs/admin/TODO.md) - admin backlog
- [`Decodocs/fileserver/README.md`](Decodocs/fileserver/README.md) - MinIO/fileserver operations
- [`Decodocs/infra/README.md`](Decodocs/infra/README.md) - infra module notes
- [`Decodocs/mobile/README.md`](Decodocs/mobile/README.md) - mobile app notes

## Analysis docs (keep but treat as snapshot/working notes)

- [`README_AI_ANALYSIS_DOCS.md`](README_AI_ANALYSIS_DOCS.md)
- [`AI_ANALYSIS_EXECUTIVE_SUMMARY.md`](AI_ANALYSIS_EXECUTIVE_SUMMARY.md)
- [`AI_ANALYSIS_IMPLEMENTATION_PLAN.md`](AI_ANALYSIS_IMPLEMENTATION_PLAN.md)
- [`AI_ANALYSIS_QUICK_CHECKLIST.md`](AI_ANALYSIS_QUICK_CHECKLIST.md)
- [`PHASE_1_1_TEMPLATE.md`](PHASE_1_1_TEMPLATE.md)
- [`docs/FUNCTIONS_IMPLEMENTATION.md`](docs/FUNCTIONS_IMPLEMENTATION.md)
- [`docs/MASTERMIND.md`](docs/MASTERMIND.md)

## Consolidation recommendations

- Merge AI analysis "meta index" content from [`README_AI_ANALYSIS_DOCS.md`](README_AI_ANALYSIS_DOCS.md) into [`AI_ANALYSIS_IMPLEMENTATION_PLAN.md`](AI_ANALYSIS_IMPLEMENTATION_PLAN.md), then keep only one canonical entry doc.
- Fold checklist items from [`AI_ANALYSIS_QUICK_CHECKLIST.md`](AI_ANALYSIS_QUICK_CHECKLIST.md) into a checklist section inside [`AI_ANALYSIS_IMPLEMENTATION_PLAN.md`](AI_ANALYSIS_IMPLEMENTATION_PLAN.md).
- Move durable parts of [`PHASE_1_1_TEMPLATE.md`](PHASE_1_1_TEMPLATE.md) into [`docs/FUNCTIONS_IMPLEMENTATION.md`](docs/FUNCTIONS_IMPLEMENTATION.md) and archive the template if no longer actively used.
- Keep task ownership clear:
  - platform-wide tasks in [`TASKS.md`](TASKS.md)
  - DecoDocs product tasks in [`Decodocs/TODO.md`](Decodocs/TODO.md)
  - admin-specific tasks in [`Decodocs/admin/TODO.md`](Decodocs/admin/TODO.md)

## Notes

- Non-Markdown implementation files (for example `.js`, `.json`, `.yml`, shell scripts) are intentionally excluded from this index.
- To enumerate every Markdown file quickly: `rg --files -g '*.md'`.
- For doc lifecycle rules (canonical/runbook/working/snapshot), use [`docs/README.md`](docs/README.md).
