# AGENTS.md - Deployment and Hosting Policy for SnapSign-AU (and DecoDocs)

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

If a deployment ever requests Blaze/Cloud Build/Artifact Registry for basic static hosting, review firebase.json and eliminate non-static or SSR/Next.js features. Cloud Build and Artifact Registry must remain disabled unless absolutely necessary for a critical feature.