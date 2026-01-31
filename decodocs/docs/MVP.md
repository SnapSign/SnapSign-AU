# MVP Scope

## Goal
Validate the core flow for freelancers and SMBs:
**Understand -> Manage -> Act**.
## Must-Have Capabilities
- auth via Firebase (identity only)
- open PDF locally in the web app (client-first)
- extract text client-side and send to backend for AI decode
- display explanations, summaries, and risk highlights
- basic annotation or notes UI
- store docs securely when the user chooses to save
- document list with status (created, uploaded, decoding, decoded)

## MVP Architecture Constraints
- Next.js web app acts as UI + gateway
- AI and heavy processing live on VPS
- files stored in private S3-compatible object storage when persisted
- no secrets in client, all sensitive actions server-side

## Explicit Exclusions (MVP)
- full native mobile apps (use WebView wrappers)
- enterprise workflows and compliance suites
- blockchain or cryptographic proof layers
- complex signing workflows (optional later)
- deep Firestore lock-in (optional, not permanent)
- integrations (HubSpot, Drive, OneDrive, iCloud)
- invoice and receipt generation
- templates library
- watermarking

## Success Signals
- users can understand documents without needing legal help
- users can store and retrieve decoded docs later
- users can act confidently (share, sign, follow up)
- repeat usage on multiple docs within a session

## IN SCOPE (MVP)

### Core
- Upload PDF documents
- AI decode:
  - plain-language explanation
  - highlighted issues / risks
- Client-side annotations (notes, highlights)
- Basic AI rewrite suggestions
- Secure file storage
- Auth (single-user, no teams required)

### Workflow
- Document status (uploaded / decoding / decoded)
- Basic sharing via link (read-only)
- Minimal reminders (dates extracted or user-defined)

---

## OUT OF SCOPE (MVP)

Explicitly excluded:
- enterprise roles and permissions
- advanced legal compliance claims
- full-featured PDF editor
- mobile-native apps (WebView only)
- blockchain / NFT features
- deep third-party integrations
- offline mode

Anything not listed as IN is OUT by default.

---

## MVP Exit Criteria

The MVP is considered successful if:
- users upload real documents
- decoded output is read and acted upon
- users return with additional documents
- at least one workflow goes from upload → decode → action

Only after this do we expand scope.
