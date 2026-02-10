# Tasks — Roadmap Coverage

_Last updated: February 10, 2026_

This list mirrors `Decodocs/docs/ROADMAP.md` and breaks it into actionable tasks with subtasks.

## Product track tasks

### Task 1 — Stabilize PDF open and analyze flows
Subtasks:
1. Define expected UI states and gating outcomes for open and analyze flows — document happy path and failure modes.
2. Normalize error mapping and user-facing messages — ensure consistent CTA and copy across all error types.
3. Add regression coverage for open/analyze states — include anonymous, free, and pro scenarios.

### Task 2 — Finish auth linking UX and pricing upgrade flow
Subtasks:
1. Specify auth-linking UX states — anonymous to email, Google, Apple, Microsoft.
2. Implement upgrade CTA rules — align with gating cases and pricing page entry points.
3. Verify post-upgrade state refresh — ensure entitlements update without manual reload.

### Task 3 — Admin v1 for plans, limits, and feature flags
Subtasks:
1. Define admin data model in Firestore — plans, entitlements, and feature flags.
2. Build admin UI screens — list, edit, and publish controls.
3. Add server-side enforcement hooks — functions read admin config per request.

### Task 4 — Tighten usage telemetry and cost visibility
Subtasks:
1. Define required telemetry events — upload, analyze, token usage, gating.
2. Create dashboards or exports — daily usage and cost views by tier.
3. Add alerts for anomalies — spike detection and threshold notifications.

### Task 5 — Expand prompt evaluation set and regression checks
Subtasks:
1. Curate evaluation document set — diverse types and sizes.
2. Define scoring rubric — accuracy, completeness, hallucination risk.
3. Automate regression runs — compare results across model or prompt changes.

### Task 6 — Google Drive integration
Subtasks:
1. Implement OAuth and token storage — least-privilege and revocable access.
2. Build file picker UX — open mode by default.
3. Add Pro upload option — explicit user action to store.

### Task 7 — OneDrive integration
Subtasks:
1. Implement Microsoft Graph OAuth — align with Drive UX.
2. Build file picker UX — consistent with Google Drive flow.
3. Add Pro upload option — same control and consent model.

### Task 8 — iCloud Drive file picker support
Subtasks:
1. Integrate browser-based file selection — open mode only.
2. Validate file handling edge cases — large files and unsupported types.
3. Ensure consistent UX — match cloud source selection flow.

### Task 9 — Email-to-sign MVP
Subtasks:
1. Define envelope format and validation — stateless free flow.
2. Implement inbound processing pipeline — parse, classify, analyze.
3. Add Pro storage option — explicit consent and retention rules.

### Task 10 — Multi-document analysis (Pro)
Subtasks:
1. Define multi-document input model — ordering and relationship mapping.
2. Build cross-document checks — conflicts and references.
3. Update UI for combined results — clear source attribution.

### Task 11 — DOCX support (Pro)
Subtasks:
1. Define conversion pipeline — normalize DOCX to internal format.
2. Enforce cost gating — charge higher token budget.
3. Add UI messaging — Pro-only and reasons explained.

### Task 12 — Mobile share-to-DecoDocs entry points
Subtasks:
1. Define iOS share flow — open file and deep-link into analysis.
2. Define Android share flow — same pipeline as web.
3. Ensure auth and gating behavior — consistent with web rules.

### Task 13 — Full signing and verification (deferred)
Subtasks:
1. Define signing model — audit trail and verification requirements.
2. Decide storage and compliance needs — impact on retention and policy.
3. Draft initial UX — placeholder until capacity permits.

## Enterprise track tasks

### Task E1 — Enterprise requirements and procurement checklist
Subtasks:
1. Consolidate enterprise requirements — governance, auditability, security, compliance.
2. Draft a procurement checklist — single page for risk review.
3. Create internal acceptance criteria — pass/fail per requirement.

### Task E2 — DPA, privacy, and security posture docs
Subtasks:
1. Draft DPA template — data ownership, processing, and deletion.
2. Update privacy policy — clear data usage and retention rules.
3. Publish security posture — controls, responsibilities, and process.

### Task E3 — Audit log schema and retention policy design
Subtasks:
1. Define audit log schema — action, actor, timestamp, object.
2. Decide retention defaults — configurable per org.
3. Design immutability strategy — append-only and tamper-evident.

### Task E4 — SSO (SAML) and RBAC foundations
Subtasks:
1. Choose SSO provider integration — SAML-based with IdP mapping.
2. Define role model — viewer, analyst, admin.
3. Enforce RBAC on all endpoints — client and server parity.

### Task E5 — Org ownership, admin visibility, export controls
Subtasks:
1. Implement org-level document ownership — user data under org scope.
2. Add admin visibility controls — audit and access with policy checks.
3. Add export control toggles — disable personal exports if required.

### Task E6 — Immutable audit logs with CSV export
Subtasks:
1. Implement append-only logging — no update or delete.
2. Build export endpoint — CSV or SIEM-friendly format.
3. Add admin UI for log access — filters and date ranges.

### Task E7 — Security baseline program
Subtasks:
1. Write incident response plan — roles, steps, and timeline targets.
2. Publish vulnerability disclosure policy — intake and SLA.
3. Schedule security reviews — quarterly minimum.

### Task E8 — SCIM provisioning
Subtasks:
1. Implement SCIM endpoints — user create, update, delete.
2. Map SCIM groups to roles — enforce RBAC.
3. Test with common IdPs — Okta and Azure AD.

### Task E9 — SIEM integration
Subtasks:
1. Define log export format — JSON and syslog options.
2. Add streaming or scheduled export — configurable per org.
3. Validate with one SIEM — Splunk or Datadog.

### Task E10 — Data residency and subprocessor list
Subtasks:
1. Document current data regions — storage and processing.
2. Publish subprocessor list — providers and regions.
3. Define residency options — requirements and limitations.

### Task E11 — Admin dashboard for usage, limits, toggles
Subtasks:
1. Define dashboard KPIs — docs, pages, tokens, costs.
2. Implement org-level limits — caps and alerts.
3. Add feature toggles — per org controls.

### Task E12 — Async processing, queue, retry, fallback
Subtasks:
1. Implement job queue — durable processing pipeline.
2. Add retry strategy — backoff and failure handling.
3. Add provider fallback — secondary model or provider.

### Task E13 — Status page and draft SLA
Subtasks:
1. Launch status page — uptime and incident history.
2. Define availability targets — uptime and support response.
3. Publish draft SLA — simple enterprise-ready format.

### Task E14 — SOC 2 readiness
Subtasks:
1. Define control framework — map to SOC 2 criteria.
2. Collect evidence workflows — access, change, and incident logs.
3. Prepare for Type I assessment — documentation complete.

### Task E15 — ISO 27001 readiness
Subtasks:
1. Define ISMS scope — systems and processes covered.
2. Implement risk management process — register and mitigation plan.
3. Prepare for certification path — gap analysis and roadmap.
