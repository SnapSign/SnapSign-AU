# AGENTS.md - Deployment and Hosting Policy for DecoDocs

## Hosting/Functions Requirements
- **Only use simple (static or SPA) Firebase Hosting and basic gen2 Functions.**
- Do NOT use Advanced Hosting (SSR, Next.js app hosting, preview channels, or Cloud Build triggers).
- Do NOT configure 'webframeworks', SSR, or 'app hosting' in firebase.json or deployment scripts.
- Hosting must always point to the built static site output (e.g., `dist/`) and never require a build server.
- Functions must be simple, not depend on advanced triggers, and reside in a single functions directory for basic API/utility use only.
- All configuration should permit deployment on the Spark (free) or Blaze (pay-as-you-go) plan, but never force advanced/locked vendor-specific features.

---

If any hosting or function scripts require Blaze/Cloud Build, re-check your firebase.json and eliminate non-static or SSR-related features. All deployments should keep Cloud Build and Artifact Registry disabled unless absolutely necessary for your product.