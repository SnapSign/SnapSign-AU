# Tasks — snapsign.com.au (Astro)

_Last updated: February 11, 2026_

## Context used (source docs)
- `LANDING_INSTRUCTIONS.md` (landing-page structure + single CTA guidance)
- `Decodocs/docs/PRODUCT.md` (positioning + Understand → Manage → Act model)
- `Decodocs/docs/TERMINOLOGY.md` ("Decode", "Understand/Manage/Act", "Signing is downstream")
- `Decodocs/docs/SECURITY.md` (safe, accurate security posture claims)
- `Decodocs/docs/STATUS_SUMMARY.md` (current state: live MVP, still iterating)
- `Decodocs/docs/SUBSCRIPTION_TIERS.md` (tiers + limits; use carefully to avoid overclaiming)
- `Decodocs/landings/*.md` (source copy for use-case pages)
- `Decodocs/HUBSPOT_SETUP_INSTRUCTIONS.md` (problem-first tracking)

---

## Task 1 — Corporate Identity & Header Structure
**Why**: snapsign.com.au is the official corporate site for Snap Sign Pty Ltd, with DecoDocs as the flagship product. The UI needs to pivot to a corporate-led identity.

**How (files + steps)**
1. Update the top-left logo area in `src/components/SiteHeader.astro` to feature "Snap Sign Pty Ltd" (or the Snap Sign corporate logo) rather than just the product icon.
2. Add a direct "DecoDocs" link in the navigation bar, linking to decodocs.com.
3. Replace the generic "Digital Signature Solutions" hero text in `src/pages/index.astro` with the company mission statement.

**Suggested copy**
```
Hero H1: Snap Sign Pty Ltd: Innovating document clarity and security through AI.
Hero subheadline: Empowering freelancers and small businesses with AI-powered document understanding.
```

---

## Task 2 — DecoDocs Product Integration
**Why**: DecoDocs is the flagship product of Snap Sign Pty Ltd. The site should highlight it prominently while maintaining corporate branding.

**How (files + steps)**
1. Create a dedicated "Product Spotlight" section for DecoDocs in `src/pages/index.astro`.
2. Include a "Try DecoDocs" button that links to decodocs.com.
3. Update features to "DecoDocs Capabilities" (e.g., Explain clauses in plain English, Risk flags and severity).

**Suggested copy**
```
Product Spotlight: DecoDocs
- Explain clauses in plain English
- Highlight risks and obligations
- Manage documents in one workspace
- Share and sign with clarity
Try DecoDocs button: Links to https://decodocs.com
```

---

## Task 3 — Trust & Startup Transparency
**Why**: As a startup, building credibility through leadership and transparency is key.

**How (files + steps)**
1. Add a "Leadership" section in `src/pages/index.astro` with Iryna Vasylkova's profile, including a short bio and link to LinkedIn.
2. Create a "Partner with Us" page (`src/pages/partner.astro`) including the NDA procedure.
3. Add "Powered by Snap Sign Pty Ltd" watermarks in footer and product sections.

**Suggested copy**
```
Leadership: Iryna Vasylkova, Founder & CEO

Iryna Vasylkova is the founder and CEO of Snap Sign (Snap Sign Pty Ltd), an AI-powered digital signature startup focused on making secure online document signing simple and accessible for individuals and businesses. With a background in language services and international collaboration, she brings strong communication skills and cross‑cultural experience to building digital products and partnerships.

Through Snap Sign’s DecoDocs platform, she is working on smart, AI‑driven proofreading and seamless integrations that streamline legal and business workflows while helping users go paperless. As a woman entrepreneur, Iryna is passionate about inclusive, user‑friendly technology and actively engages with innovation and startup ecosystems such as Croc Pitch and collaboration programs in Australia and beyond.

Partner with Us: Contact us for collaboration opportunities. NDA procedure: [Details on NDA process].
```

---

## Task 4 — Technical & Visual Alignment
**Why**: Consistent branding across snapsign.com.au and decodocs.com prevents fragmentation.

**How (files + steps)**
1. Ensure consistent brand colors, fonts, and styles across both sites.
2. Create a dedicated "Contact Us" page (`src/pages/contact.astro`) distinguishing company inquiries from DecoDocs support.

**Suggested copy**
```
Contact Us:
- General company inquiries: team@snapsign.com
- DecoDocs support: iryna@snapsign.com.au
```

---

## Task 5 — Content Strategy for a Startup
**Why**: Startup sites should reflect legal compliance and future vision.

**How (files + steps)**
1. Update footer in `src/components/SiteFooter.astro` to state: "Snap Sign Pty Ltd is a Singapore-based startup..." and link to Privacy Policy and Terms of Service.
2. Add a "Product Roadmap" section for DecoDocs (e.g., "Coming in Q3: Mobile Integration").

**Suggested copy**
```
Footer: Snap Sign Pty Ltd is a Singapore-based startup. [Privacy Policy] [Terms of Service]
Product Roadmap: Upcoming features for DecoDocs - Q3: Mobile Integration, Q4: Advanced AI insights.
```

---

## Task 6 — Enforce a single primary CTA above the fold
**Why**: `LANDING_INSTRUCTIONS.md` mandates one conversion goal per page.

**How (files + steps)**
1. Keep one primary CTA near the hero: "Try DecoDocs".
2. Move other CTAs below the fold.

---

## Task 7 — Add a product screenshot/preview
**Why**: Visual proof element as per `LANDING_INSTRUCTIONS.md`.

**How (files + steps)**
1. Add image block below hero using `public/images/snap.webp`.
2. Caption: "See DecoDocs in action."

---

## Task 8 — SEO hygiene: sitemap + robots + canonical redirect
**Why**: Static sites need explicit sitemap/robots.

**How (files + steps)**
1. Update `public/sitemap.xml` with all routes.
2. Update `public/robots.txt`.
3. Move canonical redirect to `BaseLayout.astro`.

---

## Task 9 — Add problem attribution to outgoing links
**Why**: `Decodocs/HUBSPOT_SETUP_INSTRUCTIONS.md` requires tracking.

**How (files + steps)**
1. Add UTM and entry_problem to links to decodocs.com.

---

## Task 10 — Optional: lightweight pricing link
**Why**: Link to pricing without claims.

**How (files + steps)**
1. Add "See pricing" link near CTA, pointing to decodocs.com/pricing.
