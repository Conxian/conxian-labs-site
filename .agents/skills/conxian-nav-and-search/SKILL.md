---
name: conxian-nav-and-search
description: This skill should be used when changing the site header, footer, dropdown menus, or the client-side search index — anything that decides which page or anchor a visitor reaches.
---

# Navigation and search (information architecture)

`nav.js` renders the header, footer, and mobile menu at runtime on every page;
`search.js` holds the client-side index. Both are hand-maintained, so they drift
from the actual routes unless checked.

## Invariants

- Every menu entry resolves to a **distinct destination**. Do not list two labels
  that point at the same page/anchor within one menu.
- Every `/path#anchor` must have a matching `id="anchor"` on the target page.
  `tests/comprehensive-verification.spec.ts` ("internal links should be valid")
  fails otherwise.
- The mobile menu must expose the primary routes plus Pricing, Status, Console,
  and Request access.

## Dropdown interaction contract

The desktop menus use hover intent, not a bare `mouseenter`/`mouseleave` pair:

- **Open delay** (~60ms) so crossing a trigger does not flash a panel.
- **Close grace** (~220ms) so the pointer can cross the gap to the panel.
- A CSS bridge (`.cx-menu-panel::before`) spans the gap so the pointer never
  leaves the menu.
- A hover-opened menu is **pinned** by a click (the click does not toggle it
  shut); a second click closes it.
- Keyboard: `ArrowDown` opens and focuses the first item, `ArrowUp`/`ArrowDown`
  walk items, `Escape` closes and returns focus to the trigger, `Tab` out closes.
- The trailing menu anchors its panel to the right (`.cx-links > .cx-menu:last-child`)
  so it stays on screen at narrow desktop widths.

Regression coverage: `tests/nav-dropdown.spec.ts`.

## Search index rules

- `search.js` `PAGES[].url` must point at a real file. Prefer anchors
  (`docs/index.html#gateway`) when several entries share one page.
- Do not point a surface at a page it does not own (e.g. BOS -> `bos/index.html`,
  never the Enterprise page).
- Regression coverage: `tests/search-index.test.cjs` (runs in `npm run test:api`).

## Checklist before committing a nav/search change

1. `npm run test:api` — search-index integrity.
2. `npx playwright test tests/nav-dropdown.spec.ts tests/comprehensive-verification.spec.ts`
3. Confirm no menu repeats a destination and every anchor exists.
