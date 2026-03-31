# SEO / GEO / AI Discoverability Checklist

Status: working checklist

Purpose: improve discoverability in Google/Bing and improve the chance that ChatGPT, Claude, Perplexity, Gemini, and other AI tools can find, understand, and cite the public parts of this project.

This file is written for non-experts.

Important terms:
- `SEO` = search engine optimization
- `GEO` = generative engine optimization
- `AI discoverability` = making public content easier for AI systems to find and cite

Important rule:
- Only optimize public pages that should be discovered.
- Never optimize private pages, admin pages, user documents, or session-specific app routes for indexing.

Repo areas covered here:
- `snapsign.com.au/` = SnapSign marketing site
- `Decodocs/web/` = DecoDocs product site and app
- `docs.decodocs.com/` = DecoDocs docs and trust hub
- `Decodocs/admin/` = admin app, should not be indexed

---

## 0. Before You Start

- [ ] Read this whole checklist once before editing anything.
- [ ] Confirm which hosts are public and should be discoverable:
  - `https://snapsign.com.au/`
  - `https://decodocs.com/`
  - `https://docs.decodocs.com/`
- [ ] Confirm which host should stay hidden from search:
  - admin host for `Decodocs/admin`
- [ ] Confirm the project will stay on static hosting and basic functions only.
- [ ] Do not add SSR, app hosting, or advanced hosting features.

Success looks like this:
- Public pages can be crawled.
- Private routes are blocked.
- Product, trust, and docs pages clearly explain what the product does.
- Important questions have one clear page that answers them.
- AI systems have strong public pages they can cite.

---

## 1. Inventory the Current Public SEO Files

- [ ] Open and review SnapSign `robots.txt`:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/snapsign.com.au/public/robots.txt`
- [ ] Open and review SnapSign sitemap:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/snapsign.com.au/public/sitemap.xml`
- [ ] Open and review SnapSign `llms.txt`:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/snapsign.com.au/public/llms.txt`
- [ ] Open and review DecoDocs `robots.txt`:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/Decodocs/web/public/robots.txt`
- [ ] Open and review DecoDocs `llms.txt`:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/Decodocs/web/public/llms.txt`
- [ ] Open and review docs site `robots.txt`:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/docs.decodocs.com/public/robots.txt`
- [ ] Open and review docs site `llms.txt`:
  - file: `/Users/vasilkoff/Projects/SnapSign-AU.AU/docs.decodocs.com/public/llms.txt`
- [ ] Confirm whether `decodocs.com` already serves a real `/sitemap.xml`.
- [ ] Confirm whether `docs.decodocs.com` already serves a real `/sitemap.xml`.
- [ ] Write down any missing files before making changes.

Done when:
- You know which SEO files already exist on each public host.

---

## 2. Fix `robots.txt` on All Public Hosts

Goal:
- Let search and AI crawlers access public pages.
- Keep private routes blocked.

### 2.1 SnapSign `robots.txt`

- [ ] Keep `User-agent: *`.
- [ ] Keep public marketing pages allowed.
- [ ] Keep the `Sitemap:` line present and correct.
- [ ] Add explicit crawler entries so policy is obvious to future maintainers.
- [ ] Add or verify these user-agent names:
  - `OAI-SearchBot`
  - `GPTBot`
  - `Claude-SearchBot`
  - `Claude-User`
  - `ClaudeBot`
  - `PerplexityBot`
  - `Googlebot`
  - `Google-Extended`
  - `Bingbot`

Notes for non-experts:
- `OAI-SearchBot`, `Claude-SearchBot`, `Claude-User`, and `PerplexityBot` matter most for discovery and citations.
- `GPTBot`, `ClaudeBot`, and `Google-Extended` are more about training/extended use.
-  Important: allow all of them.

- [ ] Make sure the file still ends with:
  - `Sitemap: https://snapsign.com.au/sitemap.xml`

### 2.2 DecoDocs `robots.txt`

- [ ] Keep `User-agent: *`.
- [ ] Keep app-like private routes blocked:
  - `/view`
  - `/edit`
  - `/app`
- [ ] Review whether `/profile`, `/sign-in`, `/sign-up`, and similar routes should also be blocked.
- [ ] Add explicit AI/search crawler entries.
- [ ] Add a working sitemap line once sitemap exists:
  - `Sitemap: https://decodocs.com/sitemap.xml`

### 2.3 Docs site `robots.txt`

- [ ] Keep public docs pages crawlable.
- [ ] Keep private or app-like routes blocked if any exist.
- [ ] Add explicit AI/search crawler entries.
- [ ] Replace the placeholder comment with a real sitemap line once sitemap exists.

### 2.4 Admin host blocking

- [ ] Create or serve a `robots.txt` for the admin host with:

```txt
User-agent: *
Disallow: /
```

- [ ] Add a `<meta name="robots" content="noindex,nofollow">` tag in the admin app shell if possible.
- [ ] Confirm the admin host is not linked from public pages for SEO purposes.

Done when:
- Public hosts allow public pages.
- App/admin/private hosts or routes are blocked.
- Every public `robots.txt` points to a real sitemap.

---

## 3. Create or Fix Sitemaps

Goal:
- Help crawlers find the correct public pages quickly.

### 3.1 SnapSign sitemap

- [ ] Review `/Users/vasilkoff/Projects/SnapSign-AU.AU/snapsign.com.au/public/sitemap.xml`
- [ ] Check that all important public pages are included.
- [ ] Check that outdated or removed pages are not included.
- [ ] Add any missing high-value pages such as:
  - homepage
  - use cases
  - contact
  - privacy
  - terms
  - security
  - partner
- [ ] Confirm each listed URL returns `200`.

### 3.2 DecoDocs sitemap

- [ ] Create `sitemap.xml` for `decodocs.com` if it does not exist.
- [ ] Include only public marketing and trust pages.
- [ ] Do NOT include:
  - `/app`
  - `/edit`
  - `/view`
  - auth routes
  - user-specific routes
- [ ] Include high-value public pages such as:
  - homepage
  - pricing
  - about
  - contact
  - FAQ
  - security
  - methodology
  - use cases

### 3.3 Docs site sitemap

- [ ] Create `sitemap.xml` for `docs.decodocs.com` if it does not exist.
- [ ] Include public docs pages such as:
  - getting started
  - troubleshooting
  - plans
  - features
  - use cases
  - API
  - security
  - architecture
  - compliance
  - glossary
  - FAQ
  - changelog
  - status
- [ ] Exclude duplicates, preview pages, and private routes.

### 3.4 Sitemap quality check

- [ ] Confirm all sitemap URLs are canonical URLs.
- [ ] Confirm all sitemap URLs are indexable public pages.
- [ ] Confirm no sitemap contains private or duplicate URLs.
- [ ] Confirm `robots.txt` points to the correct sitemap on each public host.

Done when:
- Each public host has a real sitemap and that sitemap only contains public, useful pages.

---

## 4. Make Sure Important Public Pages Are Static HTML

Goal:
- Important pages must be readable by crawlers without requiring JavaScript execution.

- [ ] Identify the key public pages that should be cited:
  - homepage
  - pricing
  - about
  - use cases
  - FAQ
  - security
  - compliance
  - methodology
  - getting started
- [ ] For each key page, test whether the main text appears in the raw HTML response.
- [ ] If a page only shows its real text after JavaScript loads, plan to convert it to a static page or pre-rendered page.
- [ ] Keep the interactive app experience separate from the public citation-friendly pages.
- [ ] Do not rely on a JS-only SPA route for your most important marketing or trust content.

Simple non-expert test:
- Open a terminal.
- Run `curl https://example.com/page/`
- Check whether the real page text appears in the response.

Done when:
- Important public pages expose useful text in HTML without needing the app to boot.

---

## 5. Add Structured Data to SnapSign

Goal:
- Help search engines and AI systems understand the company, founder, site, and product relationship.

Main file to inspect:
- `/Users/vasilkoff/Projects/SnapSign-AU.AU/snapsign.com.au/src/layouts/BaseLayout.astro`

- [ ] Add `Organization` JSON-LD to the base layout or relevant pages.
- [ ] Add `WebSite` JSON-LD to the base layout.
- [ ] Add `Person` JSON-LD for the founder on the founder/about page or founder section.
- [ ] Add `BreadcrumbList` JSON-LD on deeper pages where breadcrumbs exist.
- [ ] Add `FAQPage` JSON-LD on any FAQ page.
- [ ] If a SnapSign page strongly presents DecoDocs as a product, consider `SoftwareApplication` or `Product` schema where appropriate.

Facts that should stay identical everywhere:
- company name
- product name
- ABN
- contact email
- website URL
- founder name

Done when:
- SnapSign pages output valid JSON-LD and the facts match the visible page text.

---

## 6. Review and Expand Structured Data on DecoDocs

Known current signal:
- `Decodocs/web/index.html` already includes some JSON-LD.

Files to inspect:
- `/Users/vasilkoff/Projects/SnapSign-AU.AU/Decodocs/web/index.html`
- `/Users/vasilkoff/Projects/SnapSign-AU.AU/Decodocs/web/src/components/astro/SEO.astro`

- [ ] Confirm the existing `Organization`, `WebSite`, and `WebApplication` schema are still correct.
- [ ] Add page-specific structured data to pricing pages, FAQ pages, and use-case pages.
- [ ] Add `BreadcrumbList` where users navigate deeper public content.
- [ ] Add `FAQPage` where there is a visible FAQ section.
- [ ] Make sure schema does not describe private app routes as public indexable content.

Done when:
- Key public DecoDocs pages have correct, page-specific schema, not only homepage-level schema.

---

## 7. Fix Titles, Meta Descriptions, and Canonicals

Goal:
- Each page should clearly say what it is about.

### 7.1 SnapSign metadata review

- [ ] Review the title and description on every main SnapSign page.
- [ ] Confirm every page has a unique title.
- [ ] Confirm every page has a unique meta description.
- [ ] Confirm every page has a canonical URL.
- [ ] Confirm every page has one clear H1.
- [ ] Confirm Open Graph tags are correct for main pages.

### 7.2 DecoDocs metadata review

- [ ] Review the title and description on each public marketing and trust page.
- [ ] Add missing metadata to any static public page.
- [ ] Make sure app routes are not treated as canonical marketing pages.

### 7.3 Docs site metadata review

- [ ] Review the title and description on all major docs/trust pages.
- [ ] Ensure each page has a clear purpose, not a generic title like `Docs` or `Page`.

Done when:
- No important public pages have vague, duplicate, or missing metadata.

---

## 8. Build Pages That AI Systems Can Cite

Goal:
- Important user questions should have one obvious public page with a clear answer.

### 8.1 Product explanation pages

- [ ] Create or improve a page that answers: `What is DecoDocs?`
- [ ] Create or improve a page that answers: `Who is DecoDocs for?`
- [ ] Create or improve a page that answers: `What document types can DecoDocs help with?`
- [ ] Create or improve a page that answers: `What is the difference between free and pro?`
- [ ] Create or improve a page that answers: `What can the AI actually do?`
- [ ] Create or improve a page that answers: `What are the limitations?`

### 8.2 Trust pages

- [ ] Create or improve a public security page.
- [ ] Create or improve a public privacy or data-handling page.
- [ ] Create or improve a public compliance page.
- [ ] Create or improve a public plans/limits page.
- [ ] Create or improve a public FAQ page.
- [ ] Create or improve a public status page.
- [ ] Create or improve a public changelog page.

### 8.3 Methodology page

- [ ] Create or improve a public methodology page that explains:
  - what the product analyzes
  - what outputs it produces
  - what “evidence” means
  - what “not legal advice” means
  - where the product may be wrong or limited

Done when:
- A buyer or AI system can find clear answers without reading the whole site.

---

## 9. Create Use-Case Pages for Real Search Intent

Goal:
- Match the way real people search and the way AI assistants answer.

- [ ] Create or improve a page for `before signing a contract`
- [ ] Create or improve a page for `small business contracts`
- [ ] Create or improve a page for `supplier agreements`
- [ ] Create or improve a page for `freelancer and agency agreements`
- [ ] Create or improve a page for `investor agreements`
- [ ] Create or improve a page for `vendor management`

Each page should include:
- [ ] who this page is for
- [ ] what documents they are dealing with
- [ ] the most common risks in those documents
- [ ] what DecoDocs helps uncover
- [ ] where the product helps most
- [ ] where a professional review may still be needed
- [ ] links to pricing, FAQ, and trust pages

Done when:
- Each target audience has an honest page answering their real problem.

---

## 10. Add FAQ Content in Plain English

Goal:
- Create content that is easy for humans and AI systems to quote.

- [ ] Add visible FAQ sections on the most important public pages.
- [ ] Write answers in simple, direct language.
- [ ] Avoid jargon unless you define it.
- [ ] Add FAQ questions such as:
  - `Is DecoDocs legal advice?`
  - `Does DecoDocs store my files?`
  - `What file types are supported?`
  - `How accurate is the AI summary?`
  - `Can I use DecoDocs for contracts?`
  - `What does free mode include?`
  - `When should I ask a lawyer?`
- [ ] Add `FAQPage` schema to pages with visible FAQ sections.

Done when:
- Important buyer objections are answered clearly on public pages.

---

## 11. Add Authorship, Ownership, and Freshness Signals

Goal:
- Show that the content is maintained and attributable.

- [ ] Add or verify company name on important public pages.
- [ ] Add or verify founder/owner details where appropriate.
- [ ] Add a visible `Last updated` date on docs and trust pages.
- [ ] Add contact details on trust pages.
- [ ] Add screenshots where helpful.
- [ ] Add product examples where helpful.
- [ ] Keep ABN and contact details consistent across all official properties.

Done when:
- Important pages show who owns them and when they were last reviewed.

---

## 12. Improve Internal Linking

Goal:
- Help crawlers understand the most important pages and relationships.

- [ ] Link SnapSign product mentions to the best DecoDocs product page.
- [ ] Link SnapSign trust mentions to the best docs/trust pages.
- [ ] Link DecoDocs product pages to FAQ, pricing, security, and methodology pages.
- [ ] Link docs pages back to relevant product pages.
- [ ] Replace weak anchor text such as `click here` or `read more`.
- [ ] Use descriptive anchor text such as:
  - `See DecoDocs pricing`
  - `Review security and data handling`
  - `Understand supplier agreement risks`

Done when:
- Important pages are connected clearly and use descriptive link text.

---

## 13. Improve Accessibility for Humans and AI Agents

Goal:
- Make the public pages easier to understand and operate.

- [ ] Check heading order on important pages.
- [ ] Add labels to buttons and forms.
- [ ] Add alt text to meaningful images.
- [ ] Use semantic landmarks such as header, nav, main, footer.
- [ ] Add or improve ARIA labels where controls are unclear.
- [ ] Review whether key forms and CTAs make sense without visual context.

Done when:
- Main public flows are understandable without guessing.

---

## 14. Keep the Admin and User Content Out of Search

Goal:
- Prevent accidental indexing of the wrong content.

- [ ] Confirm admin routes are blocked by `robots.txt`.
- [ ] Confirm admin HTML includes `noindex,nofollow` if possible.
- [ ] Confirm user document pages are not included in any sitemap.
- [ ] Confirm private app routes are not treated as public landing pages.
- [ ] Confirm no public docs page leaks private example URLs.

Done when:
- Only the content that should be public is discoverable.

---

## 15. Align Facts Across the Whole Brand

Goal:
- Help AI systems form one consistent picture of the company and product.

- [ ] Make sure company name is identical across SnapSign, DecoDocs, and docs.
- [ ] Make sure product name is identical everywhere.
- [ ] Make sure founder name is spelled the same everywhere.
- [ ] Make sure ABN is identical everywhere.
- [ ] Make sure contact emails and domain names are consistent everywhere.
- [ ] Make sure the short product description is consistent everywhere.

Check these places:
- [ ] SnapSign site
- [ ] DecoDocs site
- [ ] Docs site
- [ ] GitHub README files
- [ ] company profile pages or directories if you manage them

Done when:
- Official facts do not contradict each other.

---

## 16. Add Off-Site Authority Signals

Goal:
- Support the brand with trusted third-party mentions.

- [ ] Create or improve official company profiles where appropriate.
- [ ] Create or improve founder profile pages where appropriate.
- [ ] Add accurate product descriptions to trusted directories if you use them.
- [ ] Look for relevant legal-tech, startup, or Australian business directories.
- [ ] Prefer real, relevant mentions over bulk low-quality link building.

Done when:
- There are credible references outside your own sites supporting the brand.

---

## 17. Set Up Search and AI Traffic Monitoring

Goal:
- Know whether the changes are working.

- [ ] Set up or verify Google Search Console for public hosts.
- [ ] Set up or verify Bing Webmaster Tools for public hosts.
- [ ] Submit the sitemaps.
- [ ] Review server logs or analytics for crawler visits.
- [ ] Look for these crawler names in logs:
  - `OAI-SearchBot`
  - `Claude-SearchBot`
  - `Claude-User`
  - `PerplexityBot`
  - `Googlebot`
  - `Bingbot`
- [ ] Track referral traffic from `chatgpt.com` and other search/AI sources.

Done when:
- You can confirm real crawler activity and monitor inbound traffic.

---

## 18. Run a Monthly AI Visibility Test

Goal:
- Measure whether the brand is becoming easier to recommend.

- [ ] Once per month, test prompts such as:
  - `best AI tool to understand contracts before signing`
  - `tool to explain legal documents in plain English`
  - `AI app to review supplier agreements`
  - `tool for small business contract risk checks`
  - `safe tool to understand PDFs before signing`
- [ ] Check whether results mention:
  - SnapSign
  - DecoDocs
  - the correct public pages
  - accurate claims
- [ ] Save the date and the results in a simple log or document.
- [ ] Note which pages are being cited most often.
- [ ] Note where the AI answer is wrong or incomplete.

Done when:
- You have a repeatable benchmark and can compare progress month to month.

---

## 19. Review and Refresh Quarterly

Goal:
- Keep the public pages fresh and reliable.

- [ ] Review pricing pages.
- [ ] Review plans and limits.
- [ ] Review security page.
- [ ] Review compliance page.
- [ ] Review changelog.
- [ ] Review screenshots and product examples.
- [ ] Add new FAQs from real user questions.
- [ ] Remove outdated claims.
- [ ] Update `Last updated` dates when changes are meaningful.

Done when:
- The public content looks maintained and current.

---

## 20. Repo-Specific Priority Actions

### SnapSign priority actions

- [ ] Add structured data to `/Users/vasilkoff/Projects/SnapSign-AU.AU/snapsign.com.au/src/layouts/BaseLayout.astro`
- [ ] Review all main page titles and descriptions under `snapsign.com.au/src/pages/`
- [ ] Expand trust and methodology content if missing
- [ ] Add or improve FAQ content
- [ ] Link to the strongest DecoDocs docs/trust pages

### DecoDocs priority actions

- [ ] Add a real sitemap for `decodocs.com`
- [ ] Replace the sitemap placeholder comment in `Decodocs/web/public/robots.txt`
- [ ] Confirm public trust pages are static and indexable
- [ ] Keep `/app`, `/edit`, and `/view` out of indexing
- [ ] Expand structured data on public pages beyond the homepage shell

### Docs site priority actions

- [ ] Add a real sitemap for `docs.decodocs.com`
- [ ] Replace the sitemap placeholder comment in `docs.decodocs.com/public/robots.txt`
- [ ] Make docs the canonical source for security, compliance, methodology, FAQ, and status
- [ ] Review page metadata and structured data support in the docs stack

### Admin priority actions

- [ ] Confirm the admin host is blocked from search
- [ ] Add `noindex,nofollow` to admin if possible

---

## 21. Final Definition of Done

- [ ] Every public host has a correct `robots.txt`
- [ ] Every public host has a correct `sitemap.xml`
- [ ] Admin/private/app routes are blocked from indexing
- [ ] Important public pages are readable in raw HTML
- [ ] Structured data is valid on important pages
- [ ] Titles, descriptions, canonicals, and H1s are clean
- [ ] Product, trust, FAQ, and methodology pages exist
- [ ] Use-case pages exist for the main audiences
- [ ] Internal links connect product, docs, and trust pages clearly
- [ ] Analytics and logs show crawler access
- [ ] Monthly AI visibility testing is in place

---

## Notes

- `llms.txt` is fine to keep, but do not rely on it alone.
- Good AI discoverability usually comes from:
  - crawlable public pages
  - clear product explanations
  - trust pages
  - structured data
  - consistent facts
  - strong internal linking
  - credible external mentions
