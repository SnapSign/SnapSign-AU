# HubSpot Setup Instructions — DecoDocs

This document explains how HubSpot should be set up for DecoDocs.

Audience:
- Marketing manager
- Growth manager
- Operations manager

Goal:
Use HubSpot as a **marketing intelligence and lifecycle tool**, not a traditional sales CRM.

DecoDocs is product-led. HubSpot supports the product — it does not drive it.

---

## 1. Role of HubSpot in DecoDocs

HubSpot exists to answer these questions:
- Where do users come from?
- What problem did they try to solve?
- Did they experience real value?
- Did they come back?
- When are they ready to pay?

HubSpot is **not** used for:
- outbound sales
- deal pipelines
- enterprise CRM workflows (initially)

---

## 2. Core Concept: Problem-First Tracking

DecoDocs marketing is organized around **problems**, not features.

Each landing page corresponds to a specific user intent:
- understand contracts
- explain documents
- find risky clauses
- share and sign
- manage documents

HubSpot must track **which problem brought the user**.

---

## 3. Contact Lifecycle Stages (Required)

Configure the following lifecycle stages:

1. Visitor
2. Lead
3. Decoded Once
4. Active User
5. Paying Customer

Rules:
- Lifecycle progression is automatic
- No manual sales stages
- No "opportunity" or "deal" objects needed early

---

## 4. Required Contact Properties (Custom)

Create these custom contact properties:

### Acquisition / Intent
- `entry_landing_page` (string)
- `entry_problem` (enum)
  - understand_contracts
  - explain_documents
  - find_risks
  - share_and_sign
  - manage_documents
- `utm_source`
- `utm_campaign`
- `utm_medium`

### Product Usage
- `documents_uploaded` (number)
- `documents_decoded` (number)
- `last_decode_date` (date)
- `has_shared_document` (boolean)
- `has_signed_document` (boolean)

### Engagement
- `days_since_last_activity`
- `is_active_user` (boolean)

---

## 5. Event Tracking (Critical)

HubSpot must receive the following **custom events** from the product:

### Core Events
- `doc_uploaded`
- `doc_decoded`
- `doc_shared`
- `doc_signed`

### Optional (Later)
- `reminder_set`
- `deadline_reached`
- `document_reopened`

Each event must include:
- user ID
- document ID
- problem context (from entry page)
- timestamp

---

## 6. Landing Page Attribution Rules

Each landing page must:
- pass a hidden `entry_problem` value
- persist it through signup
- store it on the contact record

This allows answering:
> “Which problem converts best into paying users?”

Never lose this attribution.

---

## 7. Email Strategy (Strict Rules)

Email is **contextual**, not promotional.

### Allowed Emails (Early Stage)

1. Transactional
   - “Your document is decoded”
   - “Your document was signed”

2. Contextual Follow-ups
   - “You decoded a contract — here’s what to check next”
   - “You shared a document — track its status here”

3. Reminder-Driven
   - deadlines
   - renewals
   - follow-ups

### NOT Allowed (Early)
- newsletters
- generic marketing blasts
- feature announcements
- “check out our blog”

If it does not relate to a document, do not send it.

---

## 8. Automation Rules (Minimal)

### Lifecycle Automation

- Visitor -> Lead
  Trigger: signup OR first upload

- Lead -> Decoded Once
  Trigger: first successful `doc_decoded`

- Decoded Once -> Active User
  Trigger: second document decoded OR document shared/signed

- Active User -> Paying Customer
  Trigger: successful payment

No complex workflows early.

---

## 9. Dashboards (Must-Have)

Create a dashboard that answers:

- Top entry problems (by landing page)
- Decode -> second decode conversion
- Decode -> share/sign conversion
- Free -> paid conversion
- Retention: users decoding again within 30 days

Dashboards should be **readable in 2 minutes**.

---

## 10. What NOT to Set Up

Explicitly avoid:
- Deal pipelines
- Sales rep ownership
- Lead scoring models
- Enterprise CRM complexity
- Over-automation

HubSpot should observe behavior, not dictate it.

---

## 11. Success Criteria for HubSpot Setup

HubSpot setup is successful if:
- You can clearly see which problems drive usage
- You can track value moments (decode, share, sign)
- Emails feel helpful, not spammy
- Pricing and landing decisions are data-backed

If HubSpot feels “heavy”, it is set up incorrectly.

---

## 12. Guiding Principle

HubSpot serves **clarity**, just like the product.

If a configuration:
- adds noise
- increases friction
- pushes sales thinking too early

It does not belong.

Update this document if strategy changes.
