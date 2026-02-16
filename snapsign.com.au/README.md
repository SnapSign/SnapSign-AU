# SnapSign.com.au

Official website source for **Snap Sign Pty Ltd** — an AI-powered legal-tech brand.

## Purpose

`snapsign.com.au` is the corporate website for Snap Sign Pty Ltd.  
It presents the company, its founder, and its flagship product **DecoDocs** as a high-end, trustworthy document-intelligence platform.

The site exists to:

- communicate the company mission and AI-first product vision;
- showcase DecoDocs capabilities (AI summaries, risk flags, evidence views);
- introduce founder **Iryna Vasylkova** and her engineering-meets-legal-clarity approach;
- direct visitors to try DecoDocs and connect with the team;
- build trust with customers, partners, and investors.

## Design System — "Legal-Tech Modern"

The visual identity targets **clean, trustworthy, high-tech**.

### Colour Palette

| Token            | Hex       | Role                     |
|------------------|-----------|--------------------------|
| Deep Royal Blue  | `#0A2463` | Authority / Trust        |
| Deco Teal        | `#00D1C1` | Action / Innovation      |
| Electric Purple  | `#8A2BE2` | AI / Intelligence accent |
| Background       | `#F8FAFC` | Cool off-white           |

### Typography

- **Headings:** Manrope (Bold 700, letter-spacing `-0.02em`)
- **Body:** Inter (Regular 400, line-height `1.6`)

### Visual Language

- Border radius: `12px` cards/buttons, `16px` hero cards, `24px` hero sections.
- Shadows: soft diffused "floating" style (`0 10px 30px rgba(0,0,0,0.05)`).
- Glassmorphism on the Founder card (`backdrop-filter: blur(12px)`).
- Circuitry SVG watermark at ~6 % opacity behind the founder photo.
- Ambient teal/purple background blurs for depth.

## Key Sections (index page)

1. **Hero** — headline, AI-focused lede, gradient CTA, product preview image.
2. **Product Spotlight: DecoDocs** — capability grid (6 AI features), teal CTA.
3. **How It Works** — 3-step cards (Upload → Decode → Act).
4. **Use Cases** — 6 linked cards (Understand, Explain, Risk, Share, Manage, Translate).
5. **Trust & Safety** — privacy and security bullet points.
6. **Founder: "The Engineering Mind"** — glassmorphism 2-col section with Iryna Vasylkova's photo, circuitry watermark, "Explore DecoDocs AI" teal CTA. Photo moves below text on mobile.
7. **Product Roadmap** — quarterly milestones.
8. **Bottom CTA** — "Get Started Free" driving to DecoDocs.

## Navigation

| Label              | Target                         |
|--------------------|--------------------------------|
| AI Decoder         | decodocs.com (external)        |
| Enterprise Signing | `/#features`                   |
| How it works       | `/#how-it-works`               |
| Use cases          | `/#use-cases`                  |
| Contact            | `/contact/`                    |

A **"Powered by DecoDocs AI"** badge (Electric Purple) appears in both the header and footer.

## Tech Stack

- **Astro** (static output) — no SSR, no frameworks.
- Deployed as a Firebase Hosting target (`site: "snapsign-au"`) from this repo's `snapsign.com.au/dist/`.
- Google Fonts: Inter + Manrope.
- Zero JavaScript frameworks; pure HTML + CSS + Astro components.

## CEO and Founder

**Iryna Vasylkova** leads Snap Sign Pty Ltd with a data-engineering background and a clarity-first approach to AI-powered document tooling.

## Development

```bash
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the build
```

## Collaboration

We welcome product partners, early adopter teams, technical contributors, and investors.  
Reach out via [team@snapsign.com](mailto:team@snapsign.com) or visit the [Partner page](/partner/).
