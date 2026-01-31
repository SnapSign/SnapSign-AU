# Decisions

## Architecture
- hybrid architecture: client-heavy UI + server-authoritative security
- ReactJS web app hosted on Firebase as UI and gateway
- Firebase Auth for identity only
- Firebase Hosting for static content delivery
- VPS backend for AI, search, and background jobs
- object storage (S3-compatible) as canonical file store
- client-first decode: extract text in browser, send text to backend for AI, persist file only when needed

## Infra Management
- Ansible is the standard for VPS configuration and deployment
- Docker Compose as runtime standard
- one compose stack per logical service group

## Mobile
- Phase 1 mobile is WebView wrapper around the web app
- native features added only after clear product signals

## Product Positioning
- understanding is the product; signing is optional
- core model is Understand -> Manage -> Act for freelancers and SMBs
- clarity over complexity
- docs before signatures

## Constraints
- no public buckets
- no secrets in git
- no long-lived signed URLs
- Firestore optional, not a lock-in

## Optional / Later
- wallet-based electronic signature is optional and not MVP
- blockchain timestamping/NFT proof is optional and not core
