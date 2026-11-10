---
name: conxian-design-system
description: This skill should be used when editing any Conxian Labs site markup or CSS — pages, components, tokens, or "Ivory Foundation" styling — to keep the visual system and its automated design-compliance checks intact.
---

# Conxian "Ivory Foundation" design system

The homepage, sub-pages, and standalone pages share one token set. Change the
tokens, not the pages, and never hardcode a color that a token already owns.

## Canonical tokens (enforced by `tests/design-compliance.spec.ts`)

| Token | Value | Use |
|---|---|---|
| `--bg` / `--cx-bg` | `#FDFBF7` | Page background (Ivory) |
| surface | `#FFFFFF` | Panels and cards |
| `--accent` / `--cx-accent` | `#C25E00` | Primary accent (Earthy Orange) |
| `--primary` / `--cx-primary` | `#2E403B` | Brand secondary (Deep Forest Green) |
| `--text-main` / `--cx-ink` | `#121212` | Body text |
| `--text-dim` / `--cx-dim` | `#555555` | Secondary text |
| `--radius` | `4px` | Sharp institutional corners |

- Body background must resolve to `rgb(253, 251, 247)` and body color to
  `rgb(18, 18, 18)`. `.cx-brand-mark` background must resolve to `rgb(194, 94, 0)`.
- Typography is JetBrains Mono everywhere, self-hosted in `fonts/` (no CDN).
- The brand mark fill is `--cx-accent`. `css/sovereign-synergy.css` may add an
  inset sheen but must not replace the fill.

## Where the CSS lives

- `css/common.css` — shared tokens, `body` reset, `.mono-text`.
- `css/site.css` — the site shell (`.cx-*`): header, dropdowns, footer, buttons,
  cards, pricing tiers, forms. **This is the source of truth for shared chrome.**
- `css/sovereign-synergy.css` — additive homepage-only treatment (`body.cx-labs-home`).
- `package-page.css` — sub-page layout (`package-page.css` imports the two above).
- `css/tailwind.css` — prebuilt utility classes used only by `index.html`.

## Rules

1. Do not delete a token or a `.cx-*` rule that a test asserts on. Check
   `tests/design-compliance.spec.ts` and `tests/comprehensive-verification.spec.ts`
   before removing CSS.
2. Before removing a class, prove it is unused across `*.html`, `*.js`, and
   `*.css` (`grep -rn "class-name" --include=*.html --include=*.js`). Shared
   chrome is injected at runtime by `nav.js`, so a class can be live without
   appearing in any `.html` file.
3. Add motion behind `@media (prefers-reduced-motion: reduce)`.
4. Respect the token contrast: dim text on Ivory is `#555555`; do not lighten it.
5. When a shared component changes, prefer editing `css/site.css` so every page
   inherits the change instead of patching each page.
