# Security Rules (Non-Negotiable)

## Access and Secrets
- no secrets in client code
- auth tokens verified server-side
- storage credentials never exposed to clients
- AI provider keys only on VPS

## Storage
- buckets are private by default
- all uploads/downloads use short-lived pre-signed URLs
- no public buckets or long-lived signed URLs

## Server-Side Only Actions
- AI calls and model usage
- pre-signed URL generation
- access control decisions
- email workflows and notifications
- payments (future)

## Data Boundaries
- files live in canonical object storage
- decode outputs are authoritative on VPS backend
- Firestore is optional and not a hard dependency

## Default Posture
If unsure, deny by default.
