
# /infra

This folder contains **infrastructure configuration, documentation, and scripts**
for running DecoDocs in production and staging environments.

The infra is intentionally **hybrid and modular**, avoiding hard lock-in to any single provider.

---

## Infra Philosophy

- **Control where it matters** (AI, storage, cost-heavy operations)
- **Use managed services where they save time** (identity, hosting)
- **Design for migration** (nothing should block future moves)

Infra decisions must support:
- predictable costs
- clear security boundaries
- incremental scaling
- minimal operational burden early on

---

## High-Level Architecture

```

Client (Web / Mobile WebView)
|
| Firebase Auth (identity only)
v
Next.js Server Routes (gateway)
|
+--> Contabo Storage (files)
|
+--> VPS Backend (AI, decode, search)

```

---

## Responsibilities by Layer

### Firebase (minimal usage)
- **Auth only**
  - identity
  - token issuance
- No business logic required here
- Firebase Functions are optional and not core

### Next.js (web gateway)
- Auth token verification
- Authorization checks
- Pre-signed URL requests
- Lightweight orchestration
- No heavy AI or background jobs

### Contabo (canonical file storage)
- PDFs and document artifacts
- Private buckets only
- Access via short-lived pre-signed URLs
- No public files

### VPS (core backend)
- AI decode pipelines
- OCR (if needed)
- Semantic search & embeddings
- Background jobs / queues
- Rate limiting & cost control
- Secure email workflows (future)

---

## Infrastructure Components (Planned)

```

/infra
/contabo        # Storage setup (Object Storage / MinIO configs)
/vps            # Backend server provisioning
/db             # Postgres / vector DB configs
/queues         # Background job configs
/env            # Environment variable references (no secrets)
/scripts        # Provisioning and maintenance scripts

```

Exact structure may evolve as the system grows.

---

## File Storage Strategy

- Canonical storage lives outside Firebase.
- Prefer **Contabo Object Storage (S3-compatible)**.
- Alternative: Storage VPS + MinIO.

Rules:
- Buckets are private.
- All uploads/downloads use pre-signed URLs.
- URLs are short-lived.
- No client ever sees storage credentials.

---

## Data Ownership & Sources of Truth

| Data type | Source of truth |
|--------|----------------|
| User identity | Firebase Auth |
| Files | Contabo storage |
| Decode results | VPS DB (or Firestore early) |
| Metadata / UI state | Firestore (early), Postgres (later) |

Infra should not assume Firestore is permanent.

---

## Environments

At minimum:
- **local**
- **staging**
- **production**

Infra scripts should support:
- environment-specific configs
- separate storage buckets
- isolated databases

---

## Security Rules

Non-negotiable:
- Secrets never committed
- No public buckets
- No long-lived signed URLs
- All access verified server-side
- AI keys only on VPS

If unsure, default to **deny**.

---

## Scaling Assumptions (Early)

- Single VPS for AI + decode
- Horizontal scale only when needed
- Background jobs preferred over synchronous work
- Optimize cost before optimizing latency

---

## What Does NOT Belong Here

- Application UI code
- Business logic
- AI prompt logic (lives in `/ai`)
- Client-side configs

This folder is infra-only.

---

## Change Management

If you change:
- storage provider
- auth strategy
- backend boundaries

You **must update this README first**.

This file is the contract for how DecoDocs runs.


