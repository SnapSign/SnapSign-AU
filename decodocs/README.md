# DecoDocs

**Decode documents. Act with confidence.**

DecoDocs is an AI-powered document workspace that helps people **understand, clarify, and safely act on documents** before they sign, send, or rely on them.

This repository is the canonical home for the DecoDocs web application, supporting services, and project documentation.

Key docs:
- `docs/README.md`

---

## Why DecoDocs Exists

Most people do not struggle with *signing* documents.  
They struggle with **understanding them**.

Contracts, invoices, policies, PDFs, and agreements are:
- unclear
- verbose
- risky
- easy to misunderstand
- written for lawyers, not humans

DecoDocs solves the problem **before the signature**.

---

## Core Idea

DecoDocs helps users **decode documents** by:

- explaining content in plain language  
- highlighting risks, inconsistencies, and unclear clauses  
- suggesting improvements or alternative wording  
- preparing documents for confident action  
- optionally supporting signing and sharing as a final step  

**Signing is a feature.  
Understanding is the product.**

---

## What “Decode” Means in Practice

When a user uploads a document, DecoDocs helps them:

1. **Understand**  
   - Plain-language explanations  
   - Section-by-section summaries  

2. **Clarify**  
   - Highlight unclear or risky parts  
   - Explain why something may be problematic  

3. **Fix**  
   - AI-assisted rewrites  
   - Cleaner, safer alternative text  

4. **Prepare for Action**  
   - Know what to sign, send, or question  
   - Track important dates and obligations  

5. **Act (Optional)**  
   - Send for signature  
   - Sign digitally  
   - Store and reference later  

---

## What DecoDocs Is NOT

- Not just an e-signature tool  
- Not a legal advice replacement  
- Not a blockchain-first product  
- Not an enterprise-only platform  

DecoDocs is **human-first, clarity-first**.

---

## Target Users (Initial)

- Founders and startup teams  
- Freelancers and consultants  
- Small businesses  
- Non-legal professionals dealing with documents  

Future expansion may include teams, integrations, and regulated workflows.

---

## High-Level Features

### Document Intelligence
- AI explanation and summaries
- Risk and issue highlighting
- Plain-language decoding
- Semantic search across documents

### Editing & Preparation
- AI-assisted rewriting
- PDF editing (lightweight)
- Templates for common documents

### Workflow
- Send documents for review or signature
- Email-based signing flow
- Reminders for deadlines and payments

### Storage
- Secure document storage
- AI-powered semantic search
- Version-aware history

### File Upload & Processing Policy
- Files under 10MB processed with client-side preview
- Files larger than 10MB require authentication and server-side processing
- Only registered users with active subscriptions can process large files on server
- Free-tier users limited to smaller files with client-side processing
- Explicit user consent required before any file upload

### Optional / Later
- Integrations (Drive, OneDrive, HubSpot, etc.)
- Mobile apps
- Advanced compliance modes
- Cryptographic or blockchain-based proof layers

---

## Product Philosophy

- **Clarity over complexity**
- **Docs before signatures**
- **Confidence over compliance theater**
- **Progressive disclosure** (advanced features only when needed)

---

## Repository Structure (Planned)

```

/web            # ReactJS web application hosted on Firebase
/ai             # AI prompts, pipelines, and logic
/docs           # Product and technical documentation
/infra          # Infrastructure and deployment configs
/scripts        # Dev and ops scripts
/mobile
```

Exact structure may evolve as the project grows.

---

## Technology (Specific Architecture)

The project uses a specific technology stack:

Stack areas:
- ReactJS web frontend hosted on Firebase
- Mozilla PDF.js for PDF rendering and parsing
- PDF-LIB (Hopding/pdf-lib) for client-side PDF editing
- Firebase Authentication for user identity
- Firebase Functions as secure proxy for AI services
- Firebase Hosting for static content delivery
- Server-side APIs on VPS
- Gemini SDK for AI model integration (accessed via Firebase Functions)
- Secure document handling
- Scalable storage and search

Decisions will favor **clarity, maintainability, and control**.

---

## Status

🟡 Early-stage development  
🧠 Core concept and naming finalized  
🛠 MVP scope being defined  

This repository will evolve alongside the product.

---

## Vision

In the long run, DecoDocs aims to become:

> The place where documents stop being scary, unclear, or risky —  
> and start being understandable and actionable.

---

## License

TBD

---

## Contact

Project owner:  
**Snap Sign Pty Ltd**  
📧 team@snapsign.com.au  
🌐 https://decodocs.com
