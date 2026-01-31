# SnapSign / DecoDocs — Subscription Tiers (Technical Spec)

## Core Terminology

### PDF open
- User selects a PDF for one-time analysis
- File is processed ephemerally and not stored

### PDF upload
- File is persisted on server-side storage
- Available only for paid tiers

This distinction is intentional and user-visible.

## Cost Principles

We charge only for real costs:
- LLM inference
- OCR
- Persistent storage
- Multi-pass / recursive analysis

Everything else is free.

## Tier 1 — FREE (Forever)

### Purpose
Trust-first, stateless analysis.

### User-visible features
- PDF open (text-based only)
- Plain-language explanation
- Highlight risky / unusual clauses
- On-screen results only
- No account required

### Hard technical limits
- File type: PDF
- Processing mode: open (ephemeral)
- Scan detection: If >15–20% pages lack extractable text → blocked
- Max pages: 15
- Max extracted tokens: 20,000
- LLM passes: 1
- Language: original document only
- Storage: none

### Disabled
- OCR
- Translation
- Annex deep analysis
- Export
- History
- Re-run
- Cross-section consistency

### Abuse prevention
- IP rate limits
- Token ceiling enforced preflight
- Short-lived content hash (non-persistent)

## Tier 2 — PRO ($5 / month)

### Purpose
Serious individual use.

### User-visible features
- Everything in Free
- Scanned PDFs (OCR)
- Translation
- Exportable report
- Document history
- PDF upload (stored)

### Technical limits
- Processing modes:
  - open (ephemeral)
  - upload (persistent)
- OCR: enabled
- Max pages: 100
- Max tokens: 150,000
- LLM passes: up to 3
- Storage:
  - Up to 1 GB total
  - Retention: user-controlled

### Fair use
- Monthly token budget (soft cap)
- OCR page cap
- Graceful degradation, no silent overages

## Tier 3 — PREMIUM (Business)

### Purpose
Complex, high-risk documents.

### User-visible features
- Everything in Pro
- Large PDFs & annexes
- Multi-document sets
- Cross-document checks
- Version comparison
- Audit trail
- Team access

### Technical capabilities
- Advanced chunking
- Retrieval-based deep reads
- Recursive / iterative analysis
- Definition & obligation graphs

### Storage
- Extended retention
- Access controls

## Mandatory Preflight Analyzer

Runs before any AI call:

1. Text extraction
2. Page count
3. Scan ratio
4. Token estimation
5. Complexity score

### Routing result:
- Free open
- Pro open
- Pro upload
- Premium required
- Block with explanation

## Gating Message (Standard)

> This document requires deeper analysis, available on the Pro plan.
