# DecoDocs Roadmap

_Last updated: January 28, 2026_

## Overview
DecoDocs is a document understanding product built by **Snap Sign Pty Ltd (Australia)**. It focuses on clarity before
commitment: explain what a document says, surface risks/obligations, and only then move into sharing/signing flows.

This roadmap prioritizes (1) reducing document input friction and (2) making outcomes easy to act on, before adding
heavier analysis depth.

### Naming
- **Company**: Snap Sign Pty Ltd
- **Product**: DecoDocs
- **Brand family**: SnapSign (company/umbrella branding)

---

## Current State (as of January 28, 2026)

### Implemented (in this repo)
- PDF open/view workflow in the web app
- Anonymous auth + graceful degradation when auth fails
- Firebase callable functions for:
  - `preflightCheck` (classification/limits)
  - `analyzeText` (analysis entry point, MVP behavior)
  - `getEntitlement` (plan/limits, MVP behavior)
- Firebase Hosting target uses `decodocs-repo/web/dist` (Vite build output)

### Specified/Planned (documented, not fully implemented)
- Email-to-sign flow
- Cloud storage integrations (Drive/OneDrive/iCloud)
- Full signing workflow + verification/audit exports

---

## Phase 1 — Web MVP Foundation (Live, Iterating)

### Goal
Ship a reliable, privacy-forward web experience for PDF understanding, with clear plan enforcement and predictable UI
states.

### User-facing outcomes
- Open a PDF and read it (even if auth fails)
- Trigger analysis and see results in a structured panel
- Understand what’s gated by plan (Free vs Pro) before spending time

### Technical Foundation
- Firebase Hosting + Cloud Functions + Firestore usage tracking
- Preflight document classification (size/scanned heuristics)
- Tier model and call-budget enforcement (MVP)
- Test coverage (unit + Playwright tests)
- Google Identity Services (GIS) for Google sign-in and token handling in the web app

---

## Phase 2 — Cloud Storage Integrations (Target: Q2 2026)

### Goal
Reduce friction of "getting the document in" without increasing storage liability.

### Scope (user stories)
- As a user, I can connect Google Drive / OneDrive and pick a file to analyze (explicit, user-initiated).
- As a Free user, I can **open** a cloud file ephemerally (no storage by default).
- As a Pro user, I can optionally **save/upload** (explicit action) for history/export.
- As a user, I can revoke access and the app stops using stored tokens immediately.

### Google Drive
- OAuth-based, read-only access
- Default mode: **open (ephemeral)**
- Optional: user explicitly chooses "save to DecoDocs" (Pro)
- No automatic import
- No background sync
- No file mirroring

### OneDrive
- Same model as Google Drive
- Read-only access
- No background indexing
- No file replication unless user explicitly uploads (Pro)

### iCloud Drive
- User-initiated file selection
- No continuous access
- Treated as local open, not upload

### Technical Requirements
- OAuth 2.0 integration for each provider
- Secure token management
- Unified cloud storage abstraction layer
- Consistent UI/UX across providers
- Temporary file processing pipeline

### Implementation Principles
- If a feature increases inference cost → belongs to Pro or Premium
- If a feature increases storage cost → belongs to Pro or Premium
- If a feature increases support cost → belongs to Pro or Premium

---

## Phase 3 — Paid Depth + Multi-Document (Target: Q3 2026)

### Goal
Offer deeper analysis features that are clearly more expensive (and therefore paid), without compromising the Free tier
core experience.

### DOCX Support (Premium only)
- Conversion to internal canonical format
- Normalization & cleanup
- Counts as multiple AI calls / higher budget
- No partial support

### Advanced Multi-Document Analysis
- Annex-heavy contracts
- Bundled documents
- Cross-document references
- Cross-document contradiction detection
- Version diff / compare capabilities

### Implementation Requirements
- Advanced document parsing
- Multi-document correlation algorithms
- Enhanced AI processing pipeline
- Extended storage capabilities

---

## Phase 4 — Mobile Apps (Target: Q4 2026)

### Goal
Make DecoDocs usable at the moment of decision (email attachment, file share, meeting).

### Approach (v1)
Native shells (or lightweight native apps) that open documents from the share sheet and deep-link into the same analysis
pipeline as the web experience.

### Mobile Platforms
- iOS native application
- Android native application

### Capabilities
- Open PDF from:
  - Mail attachments
  - Device files
  - Google Drive / OneDrive / iCloud
- Run same analysis pipeline as web/email
- Share-to-DecoDocs entry point
- View explanation before signing elsewhere

### Technical Constraints (v1)
- No on-device LLM inference (all processing server-based)
- No offline analysis
- No full document editing
- No native e-signature (separate phase)

### Platform Requirements
- iOS: iOS 13.0+, Xcode 12.0+
- Android: Android 7.0 (API level 24)+
- Firebase SDK integration
- Cloud storage provider SDKs

---

## Phase 5 — Signing & Verification (Target: 2027+)

### Scope
Out of the initial analysis MVP scope, but enabled by prior steps.

### Planned Features
- Append-only signatures in envelope
- Signature integrity checks
- Timeline & audit export
- Advanced signing workflows
- Legal compliance features

---

## Guiding Principles for All Phases

### Cost-Based Feature Assignment
If a feature:
- increases inference cost
- increases storage cost
- increases support cost

→ it belongs to **Pro or Premium**, never Free.

### User Experience Priorities
- Reduce friction for document input
- Maintain consistent analysis quality
- Preserve privacy and security
- Enable use at moment of decision

### Technical Standards
- Consistent API interfaces
- Secure token management
- Reliable error handling
- Scalable infrastructure

---

## Roadmap Non-Goals

### Explicitly Excluded Features
- ERP-style document management
- Auto-sync from cloud drives
- Background scanning of user files
- "Unlimited" anything
- Heavy “document management system” features
- On-device AI processing in early phases

---

## Success Metrics

### Phase 2 Success Criteria
- Cloud storage integration adoption rate
- Reduction in document upload friction
- User satisfaction with file access
- Pro tier conversion from cloud features

### Phase 3 Success Criteria
- Premium tier adoption rate
- Multi-document analysis usage
- Customer satisfaction with advanced features

### Phase 4 Success Criteria
- Mobile app download and retention
- Share-to-DecoDocs usage rate
- Mobile vs web feature parity
- User engagement at point of signing

---

## Risk Management

### Technical Risks
- Cloud provider API changes
- Mobile platform evolution
- Security vulnerability exposure
- Performance degradation with scale

### Mitigation Strategies
- Modular architecture design
- Comprehensive testing protocols
- Security-first development practices
- Performance monitoring and optimization

---

## Resource Allocation

### Phase 2 Resources
- 2 full-stack developers
- 1 mobile developer (part-time)
- 1 DevOps engineer
- 2 weeks development time

### Phase 3 Resources
- 1 backend developer
- 1 AI/ML specialist
- 1 full-stack developer
- 3 weeks development time

### Phase 4 Resources
- 1 iOS developer
- 1 Android developer
- 1 backend developer
- 4 weeks development time
