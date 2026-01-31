# Terminology

## Document
A file (usually PDF) uploaded by a user and stored in canonical storage.

---

## Decode
The process of explaining, clarifying, and analyzing a document
to reduce uncertainty and enable confident action.

---

## Annotation
User-created markup attached to a document:
- highlights
- notes
- comments

Annotations do not change the source file.

---

## Decode Result
AI-generated output that may include:
- explanations
- summaries
- risk highlights
- rewrite suggestions

---

## Understand -> Manage -> Act
The three pillars of the product:
1. Understand: decode and reduce uncertainty.
2. Manage: store, organize, and preserve context.
3. Act: share, sign, and follow up.

---

## Action
A decision taken by the user after decoding:
- signing
- sending
- editing
- questioning
- storing for later

---

## Signing
A downstream operation that finalizes a document.
Signing is optional and **never the core identity of the product**.

---

## Tenant (Future)
An organization or team boundary.
Not required for MVP but terminology is reserved.

---

## FileKey
Opaque storage identifier for a file in object storage.

---

## Gateway
Next.js server routes that verify auth and broker requests.

---

## VPS Backend
Authoritative backend for AI, search, and background jobs.

---

## Canonical Storage
Object storage holding the source files.

---

## Pre-signed URL
Short-lived URL for uploads or downloads; never long-lived.

---

## Status
Lifecycle for a document (created, uploaded, decoding, decoded).

---

## WebView Wrapper
Mobile shell that hosts the web app for Phase 1.

---

## Invoice
A generated billing document for a client, often paired with a receipt.

---

## Receipt
Proof of payment tied to an invoice or transaction.

---

## Watermark
Visible overlay text or mark added to a document for protection or status.

---

## Signature
Digital mark indicating agreement; signing is optional and downstream.
