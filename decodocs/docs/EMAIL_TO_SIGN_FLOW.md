# SnapSign — Email-to-Sign Flow (Free vs Paid) — Technical Spec (MVP)

## 0) Goals
- Enable "email-to-sign" without requiring users to create accounts (Free).
- Avoid storing user documents on SnapSign servers in Free.
- Monetize convenience + cost-heavy operations (storage, OCR, large docs) in Paid tiers.
- Keep terminology correct:
  - **Open** = ephemeral processing, no persistence.
  - **Upload** = persistent storage (Paid only).

## 1) Terms & Entities

### 1.1 Envelope file (container)
- Extension: `.snapsign` (ZIP container)
- Contents (minimum):
  - `document.pdf` (required)
  - `manifest.json` (required)
  - `metadata.json` (optional)
- Contents (optional; appended by SnapSign):
  - `analysis.json` (summary results)
  - `audit.json` (processing log, hashes, timestamps)
  - `signatures.json` (future signing stage)

### 1.2 Envelope integrity
- `doc_sha256` = SHA-256(document.pdf bytes)
- `manifest_sha256` = SHA-256(manifest.json bytes)
- All processing must validate `doc_sha256` matches actual PDF.

### 1.3 Email addresses
- Inbound: `sign@snapsign.<tld>` (example)
- Outbound: `noreply@snapsign.<tld>`
- Optional routing aliases:
  - `sign+<shortid>@...` (Paid convenience)
  - `pro+<shortid>@...` (Paid-only features)

## 2) Preflight Analyzer (runs before any AI call)
Input: `document.pdf`
Outputs:
- `page_count`
- `has_extractable_text` (bool)
- `scan_ratio` (0..1): pages with near-zero extracted text / total pages
- `estimated_tokens` (based on extracted text length)
- `pdf_size_bytes`
- `classification`: {FREE_OK | PRO_REQUIRED | PREMIUM_REQUIRED | BLOCKED}
- `reasons[]`: machine-readable + user-facing strings

Rules baseline (can be config):
- If `scan_ratio > 0.20` => PRO_REQUIRED (OCR needed) or BLOCKED for Free.
- If `page_count > 15` => PRO_REQUIRED for Free.
- If `estimated_tokens > 20_000` => PRO_REQUIRED for Free.
- If `pdf_size_bytes > 20MB` => BLOCKED for Free email delivery (likely bounce).

## 3) FREE Email-to-Sign Flow (Stateless)

### 3.1 Entry points
A) User emails `.snapsign` envelope as attachment  
B) User emails a PDF directly (optional MVP: convert into envelope internally)

### 3.2 Free constraints
- **No server-side document storage**
- **No OCR**
- **No "share links"**
- Attachment max size: **20 MB**
- PDF must be **text-based**
- Limits:
  - `page_count <= 15`
  - `estimated_tokens <= 20_000`
  - `scan_ratio <= 0.20`

### 3.3 Processing steps
1) Receive email
2) Extract attachment:
   - If `.snapsign`: unzip; read `document.pdf`; validate manifest hashes if present
   - If `.pdf`: treat as `document.pdf` (optional) and generate ephemeral manifest
3) Run **Preflight Analyzer**
4) If classification != FREE_OK:
   - Do not call LLM
   - Reply with "requires Pro" + reason list
5) If FREE_OK:
   - Run LLM analysis (single pass):
     - plain-language explanation
     - caveats / unusual clauses highlights
     - basic inconsistency flags (local only, no recursion)
6) Build response:
   - Email body: top findings + section/page references
   - Attach returned envelope:
     - original `.snapsign` returned unchanged OR
     - returned with appended `analysis.json` (still no server storage)
7) Purge all content after send:
   - Remove files from temp storage
   - Keep only operational logs without document content (see 3.5)

### 3.4 Free error handling (best-effort)
- Attachment too large / bounce:
  - If SMTP bounce received => send short message (if possible) or do nothing
  - UX messaging on web: "Free email delivery depends on your email provider limits."
- Unsupported PDF (encrypted / corrupted):
  - reply with failure reason
- Rate limiting:
  - per sender domain/IP heuristics to prevent spam

### 3.5 Free logging (allowed, non-content)
- `received_at`
- `message_id`
- `sender_email_hash` (salted hash)
- `doc_sha256`
- `page_count`, `estimated_tokens`, `scan_ratio`
- `classification` + `reasons`
- **No PDF bytes, no extracted text stored**

## 4) PRO Email-to-Sign Flow ($5/month)

### 4.1 Pro capabilities
- OCR enabled (scanned PDFs supported)
- Persistent storage (**Upload**) enabled
- Exportable report
- History
- Higher limits

### 4.2 Pro limits (baseline)
- `page_count <= 100`
- `estimated_tokens <= 150_000`
- `pdf_size_bytes <= 50MB` (configurable)
- OCR monthly caps:
  - `ocr_pages_monthly_soft_cap` (config)
  - throttle after cap, no silent overages

### 4.3 Identity & entitlement
- Sender email must be linked to a Pro subscription:
  - Option A: "login once" + verify email
  - Option B: magic-link verification per sender
- If entitlement missing => treat as Free.

### 4.4 Pro processing modes
- **Open (ephemeral)**: user wants no storage even though Pro
- **Upload (persistent)**: store envelope + report + audit

Default:
- email flow => **Open** unless user explicitly requests storage (or uses Pro alias)

### 4.5 Pro inbound routing (convenience)
- Support address aliases to set mode:
  - `open+<id>@...` => ephemeral
  - `upload+<id>@...` => persistent
- Subject commands (optional):
  - `MODE:UPLOAD`, `MODE:OPEN`

### 4.6 Pro processing steps
1) Receive email + attachment
2) Validate entitlement
3) Extract attachment -> envelope
4) Preflight Analyzer
5) If scan detected and allowed:
   - OCR pipeline -> text extraction
6) Multi-pass analysis (up to 3 passes):
   - summary & explain
   - caveats/unfair terms detection
   - deeper consistency (within doc; cross-section references)
7) If MODE=UPLOAD:
   - Store envelope + derived artifacts
   - Assign `doc_id` and `share_token` (if sharing enabled)
8) Reply:
   - Email body with findings
   - Attach updated envelope OR include secure link (Pro-only)
9) Logging includes doc_id (if stored)

## 5) PREMIUM Email-to-Sign Flow (Business)

### 5.1 Premium capabilities
- Large PDFs & annex-heavy docs
- Multi-document bundles (multiple envelopes in one thread)
- Cross-document contradiction detection
- Version diff / compare
- Audit trail & team roles
- Advanced recursive / iterative analysis when needed

### 5.2 Processing
- Hierarchical chunking + retrieval-based deep reads
- Optional RLM-style recursion for:
  - global contradictions across annexes
  - definition graph inconsistencies
- Guaranteed storage + access control

## 6) User Messaging (Email + Web)

### 6.1 Standard gating message (Free -> Pro)
- Subject: `Action required: Pro needed for this document`
- Body:
  - One-line reason summary
  - Bullet reasons (pages/scan/size)
  - Pro link

Suggested text:
- "This document requires deeper analysis, available on the Pro plan."

### 6.2 Free limitation disclosure
- "Free email delivery is subject to email provider attachment limits."

## 7) Security & Privacy Requirements
- TLS for inbound/outbound mail infra
- Temp files encrypted at rest (even if short-lived)
- Strict TTL purge job for temp directories
- No document content in logs
- Hash-based integrity checks for envelopes
- Rate limiting and spam protection (DMARC/DKIM/SPF for outbound)

## 8) Acceptance Criteria (MVP)
FREE:
- Can process a text-based PDF <= 15 pages via email and reply with analysis.
- Does not store document or extracted text after sending.
- Blocks scanned PDFs and large PDFs with clear Pro message.

PRO:
- Can OCR scanned PDF and reply with analysis.
- Can optionally store envelope and return a share link.
- Enforces monthly OCR + token caps without silent overage billing.

## 9) Non-Goals (MVP)
- Multipart envelope splitting in Free
- Guaranteed delivery for large attachments
- DOCX support
- Full legal e-signature compliance (separate phase)