# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
NUS students (mostly undergraduates) signed in to EduRec, the university's PeopleSoft student system. They come for a specific look-up: a grade, an exam date and venue, how many S/U units are left, whether they are on track to graduate, whether a disbursement paid out. Visits are short and goal-driven, often on a laptop between classes, sometimes on a phone.

## Product Purpose
Better EduRec is an unofficial Chrome extension that redesigns EduRec in the student's own browser. It turns PeopleSoft's table browser into a student tool: each page answers its question first, and anything EduRec can do still works. Success is a student finding the answer on a page without reading instructions or hunting through term pickers.

## Positioning
It runs on the real EduRec pages with the student's own session, so the data is live and complete, unlike a separate app that would need credentials or scraping. It is read-only and local: nothing is uploaded.

## Operating Context
- Chrome content scripts on `myedurec.nus.edu.sg/psc/*`, plain JS, no build step.
- PeopleSoft Fluid pages swap content in place by postback; legacy pages use iframes.
- Classic view turns everything off and must restore EduRec untouched.

## Capabilities and Constraints
- Read-only: never submits, saves or changes anything. Forms keep EduRec's own fields and buttons, in place and working; the extension adds classes and wrappers only.
- Data pages: the new view replaces EduRec's table; the original stays reachable behind a disclosure.
- Dead ends (not eligible, period closed, errors) get a clear empty state with a way out.
- Parsers read page text, not markup.
- No real personal data in the repo; fixtures use invented data.
- 12 themes; every theme must keep WCAG AA body-text contrast.

## Brand Commitments
- Name: Better EduRec (unofficial). Always marked as not affiliated with NUS.
- Extends the incumbent look: Campus theme by default, `--edr-*` tokens, the sidebar and Overview. No new visual world.
- Voice: plain, short, student-facing; PeopleSoft vocabulary is translated, not repeated.

## Evidence on Hand
- `docs/research/01-site-inventory.md` (tile and sub-page inventory), `03-impeccable-critique.md` (10/40 critique).
- Live crawl dumps in `edurec-research/crawl/` (gitignored, real data; never commit).
- Claude Design prototypes in `edurec-research/redesign-source/*.dc.html`.

## Product Principles
1. Answer first: the page leads with the answer to the question the student came with.
2. Nothing lost: every EduRec function and datum stays reachable.
3. Never write: the extension observes; EduRec acts.
4. One pattern per page type, applied the same everywhere.
5. Honest dead ends: say what is unavailable, why, and where to go.

## Accessibility & Inclusion
WCAG AA contrast in every theme; full keyboard control (vim-style keys plus standard focus); works at phone width.
