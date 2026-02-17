# MDX Prompt Packs

This directory contains the prompt definitions for AI analysis of specific document types.

## File Structure

- `types/`: Contains `.mdx` files for each `typeId` defined in `documentTypes.js`.
- `types/GENERAL_DOC_TYPE.mdx`: The base prompt from which others inherit.

## MDX Schema

Each `.mdx` file must start with a Frontmatter block and contain specific markdown sections.

### Frontmatter

```yaml
---
typeId: "legal_job_offer"      # Must match documentTypes.js
inherits: "GENERAL_DOC_TYPE"   # Optional, parent type ID
version: "1.0.0"               # Semantic versioning
---
```

### Sections

The content is split into standard sections. Inherited prompts will merge these sections (current strategy: replacement or append, TBD in `prompt-loader.js`).

- `## Summary Guidance`: Instructions for generating the plain English explanation.
- `## Risk Analysis`: Instructions for identifying risks and missing clauses.
- `## Extraction Targets`: List of specific fields to extract (e.g., "Salary", "Start Date").
- `## Validation Checks`: Specific logical checks to perform.

## Adding a New Type

1. Identify the `typeId` from `web/src/constants/documentTypes.js`.
2. Create `types/<typeId>.mdx`.
3. Add `inherits: GENERAL_DOC_TYPE` (usually).
4. Define the sections that need to be specific for this type.

## Available Prompt Packs

| Type ID | Inherits From | Validation Slug | description |
| :--- | :--- | :--- | :--- |
| `general_book` | `GENERAL_DOC_TYPE` | - | Book / long-form text |
| `general_letter` | `GENERAL_DOC_TYPE` | - | Letter (general / personal) |
| `general_marketing` | `GENERAL_DOC_TYPE` | - | Flyer / advertisement |
| `general_notes` | `GENERAL_DOC_TYPE` | - | Notes / diary / journal |
| `general_police_letter` | `GENERAL_DOC_TYPE` | - | Police letter / notice |
| `general_presentation` | `GENERAL_DOC_TYPE` | - | Presentation / pitch deck |
| `general_resume_cv` | `GENERAL_DOC_TYPE` | - | Resume / CV |
| `general_schedule` | `GENERAL_DOC_TYPE` | - | Schedule / timetable |
| `general_sop_procedure` | `GENERAL_DOC_TYPE` | `sop-procedure` | SOP / procedure |
| `legal_contract_generic` | `GENERAL_DOC_TYPE` | - | Contract / agreement |
| `legal_employment_contract` | `general_letter` | - | Employment contract |
| `legal_job_offer` | `GENERAL_DOC_TYPE` | `job-offer` | Job offer / offer letter |
| `legal_lease_commercial` | `GENERAL_DOC_TYPE` | - | Commercial lease |
| `legal_lease_residential` | `GENERAL_DOC_TYPE` | - | Residential lease |
| `legal_nda` | `GENERAL_DOC_TYPE` | - | NDA |
| `business_invoice` | `GENERAL_DOC_TYPE` | `invoice` | Invoice |
| `business_purchase_order` | `GENERAL_DOC_TYPE` | - | Purchase order |
| `policy_privacy` | `GENERAL_DOC_TYPE` | `company-policy` | Privacy policy |
| `policy_terms` | `GENERAL_DOC_TYPE` | - | Terms of service |

