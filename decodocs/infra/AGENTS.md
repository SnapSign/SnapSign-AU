# AGENTS.md (infra)

This file explains **how infrastructure for DecoDocs is managed**, and how agents and contributors should reason about infra decisions.

Infra exists to **support clarity, control, and predictable cost**, not to chase complexity.

---

## Core Infra Principles

1. **Hybrid by design**
   - Managed services only where they reduce risk/time
   - Self-managed infra where cost, performance, or control matters

2. **Predictable > clever**
   - Prefer boring, repeatable setups
   - Avoid infra that requires constant babysitting

3. **Rebuildable at any time**
   - A VPS must be disposable
   - Re-provisioning should be possible from git + secrets

4. **Security first, convenience second**
   - Private by default
   - Short-lived credentials
   - Clear trust boundaries

---

## High-Level Architecture

```

Client (Web / Mobile WebView)
|
| Firebase Auth (identity only)
v
Next.js server routes (gateway)
|
+--> Contabo storage (files)
|
+--> VPS backend (AI decode, search, jobs)

```

---

## Infrastructure Responsibilities

### Firebase
Used **only** for:
- Authentication
- Token issuance

Firebase Functions are **not core infra**.
Firestore is optional and must not become a hard dependency.

---

### Contabo (Canonical Storage)
- PDFs and document artifacts
- S3-compatible Object Storage (preferred)
- Alternative: Storage VPS + MinIO

Rules:
- Buckets are private
- Access only via short-lived pre-signed URLs
- No credentials exposed to clients
- Files are the canonical source of truth

---

### VPS (Core Backend)
The VPS is where **real work happens**:
- AI decode pipelines
- OCR (if needed)
- Embeddings + semantic search
- Background workers / queues
- Rate limiting and cost control
- Email workflows (future)

The VPS is authoritative for:
- AI results
- heavy processing
- indexing/search

---

## Ansible as the VPS Management Tool

**Ansible is the standard tool for VPS configuration and deployment.**

### Why Ansible
- Declarative and reproducible
- No agent required on servers
- Easy to reason about
- Git-based source of truth
- Ideal for 1–5 VPS nodes

### What Ansible Manages
- Base system hardening
  - users
  - SSH keys
  - firewall (ufw)
  - fail2ban
- Docker + Docker Compose
- Reverse proxy (Caddy or Nginx)
- Deployment of services:
  - decodocs API
  - decodocs worker(s)
- Systemd units for compose stacks
- Environment templating (without secrets)
- Backup hooks and cron jobs
- Monitoring agents (optional)

### What Ansible Does NOT Manage (initially)
- VPS provisioning (handled via Contabo UI/API)
- Autoscaling
- Kubernetes
- Cloud provider networking abstractions

Keep it simple.

---

## Expected Ansible Structure

```

/infra/ansible
/inventory
production.ini
staging.ini
/group_vars
production.yml
staging.yml
/roles
common
docker
reverse_proxy
decodocs_api
decodocs_worker
/playbooks
bootstrap.yml
deploy.yml
update.yml

```

Secrets must **never** be committed.
They are injected at deploy time via environment variables or secure stores.

---

## Deployment Philosophy

- Docker Compose is the runtime standard
- One compose stack per logical service group
- Ansible renders configs, starts/restarts services
- Background jobs are preferred over synchronous processing
- Scale vertically first, horizontally only when needed

---

## Environments

At minimum:
- local
- staging
- production

Each environment must have:
- separate VPS
- separate storage buckets
- separate databases
- isolated credentials

---

## Security Rules (Non-Negotiable)

- No public buckets
- No long-lived signed URLs
- No secrets in git
- AI keys only on VPS
- Auth tokens always verified server-side
- Principle of least privilege everywhere

If unsure → deny by default.

---

## Cost & Scaling Mindset

Early phase assumptions:
- Single VPS for API + workers
- Scale by optimizing code, not infra
- Monitor AI cost before optimizing latency

Do not introduce infra complexity without measured pain.

---

## Change Policy

If you change:
- storage provider
- auth boundary
- backend responsibility split
- deployment strategy

**Update this file first.**

This document is the contract for how DecoDocs infrastructure works.

