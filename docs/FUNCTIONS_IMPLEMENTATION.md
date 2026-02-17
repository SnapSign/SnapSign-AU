# DecoDocs AI Functions - Implementation Documentation

## Overview
This document describes the current backend AI functions for DecoDocs/SnapSign.

It reflects the live model in `functions/index.js`:
- Firebase callable functions
- Firebase Auth (anonymous + linked providers)
- token-budget enforcement by tier
- docHash ledger + usage events
- no document content persistence in Firestore

## Architecture

### Components
- Firebase Cloud Functions
- Firestore (`users`, `usage_daily`, `usage_events`, `docshashes`)
- Firebase Auth
- Client-side PDF.js for extraction + SHA-256 docHash

### Data Flow
Client -> extract text -> compute docHash -> `preflightCheck` -> `analyzeText` / `analyzeByType`.

## Callable Functions

### `preflightCheck`
Purpose: classify input before expensive analysis.

Input:
- `docHash` (64-char hex)
- `stats` (`pageCount`, `charsPerPage`, `totalChars`, optional `pdfSizeBytes`)

Behavior:
- computes scan ratio (`charsPerPage < 30`)
- enforces scanned-PDF gating (Pro-only)
- enforces size guard (`FREE_MAX_TOTAL_CHARS = 120000` for non-Pro)

Output (current contract):
- `ok`
- `classification` (`OK` or `PRO_REQUIRED`)
- `requiredTier`
- `reasons[]`
- `entitlement` (`tier`, `isPro`)
- `stats` (`scanRatio`, `estimatedTokens`)

### `analyzeText`
Purpose: text-first analysis with tier budget enforcement.

Input:
- `docHash`
- `stats`
- `text.value`

Behavior:
- validates docHash/text
- recomputes scan ratio and blocks OCR-required docs for non-Pro
- computes `estimatedTokens = floor(totalChars / 4)`
- enforces per-tier token budgets
- writes `docshashes/{docHash}` ledger metadata
- writes `usage_events` entry

Output (success):
- `ok: true`
- `docHash`
- `result` (normalized analysis schema)
- `usage` (`estimatedTokens`, `remainingTokens`)
- `entitlement` (`tier`, `isPro`)

Output (budget/gate failure):
- `ok: false`
- `code` (`SCAN_DETECTED_PRO_REQUIRED`, `ANON_TOKEN_LIMIT`, `FREE_TOKEN_LIMIT`)
- `requiredTier`
- `usage` (`estimatedTokens`, `remainingTokens`)

### `analyzeByType`
Purpose: type-routed analysis path (currently heuristic/placeholder, token-budgeted).

Behavior:
- same token budget enforcement as `analyzeText`
- resolves effective type (`override` vs detected)
- loads validation spec metadata
- returns structured type-specific placeholder result

### `getEntitlement`
Current response:
- `tier` (`anonymous|free|pro`)
- `isPro`
- `storageEnabled`, `ocrEnabled`
- `anonTokensPerUid`, `freeTokensPerDay`

## Tier Budget Model (Current)

- Anonymous:
  - budget: `20,000` tokens per identity session (current implementation key: puid, where `puid == uid` today)
  - OCR: no
- Free (non-anonymous, no active Pro flag):
  - budget: `40,000` tokens/day (UTC) per puid
  - OCR: no
- Pro:
  - budget: unrestricted in this layer (fair-use policy may apply separately)
  - OCR: yes
- Business:
  - product tier is documented in `Decodocs/docs/SUBSCRIPTION_TIERS.md`
  - current Functions entitlement resolver exposes `pro` capability flag; Business should be treated as Pro-capable in runtime until dedicated `business` tier branching is added

## Firestore Model (Current)

- `users/{puid}`
  - entitlement flags (`isPro`, subscription metadata)
  - anonymous usage accumulator (`usage.anonTokensUsed`)
- `usage_daily/{puid_YYYYMMDD}`
  - free-tier daily token usage
- `usage_events/{autoId}`
  - analysis event log
- `docshashes/{docHash}`
  - doc hash ledger metadata

## Config Constants (Current)
- `MIN_CHARS_PER_PAGE = 30`
- `SCAN_RATIO_THRESHOLD = 0.20`
- `FREE_MAX_TOTAL_CHARS = 120000`
- `ANON_TOKENS_PER_UID = 20000`
- `FREE_TOKENS_PER_DAY = 40000`
- `TTL_DAYS_USAGE_DOCS = 30` (cleanup targets `usage_daily`)

## Notes
- Analysis content is still mock/placeholder in current `analyzeText` implementation.
- This doc intentionally supersedes old per-document `aiCallsUsed` documentation.
