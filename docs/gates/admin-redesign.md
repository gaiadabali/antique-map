# Gate: the CMS redesign (phase 16)

The user's request (2026-10-11): "cms ui need to be completely redesigned. and it should be light mode". Their
answers: the brand's own world built for work; all four pains (generic and unbranded, hard to find things, long
cluttered forms, poor on a phone); every screen in scope; **The Catalogue Wall** from a structure round. The
direction contract is `engine/apps/web/.impeccable/surfaces/engine-apps-web-src-app-payload.md`; DESIGN.md's
"The admin (phase 16, 2026-10-11)" records what shipped.

**Verdict: ship** — the finish review's fifth round, 2026-10-11, on staging `production-20261011T094100Z-f23ab4d1`, no open findings.

## What shipped

1. **The admin's world (16.1).** Light only. Payload's own scales retuned warm from the brand's anchors
   (`shared/styles/tokens/admin.css`): linen ground, white paper panels with one hairline, ink type, bronze for the
   one primary action, the selection and focus; Karla for everything read or clicked, Cormorant for page and record
   titles; square corners (2 px on controls). The Indies wordmark on sign-in and in the sidebar. The shell, record
   pages and lists in that world (`app/(payload)/admin/theme-*.css`).
2. **The Catalogue Wall (16.2).** The admin's home: today's work in one strip (orders to act on, new leads, AI
   drafts to check, drafts), filter chips by site and state with the search beside the title, the archive as matted
   cards with one state tag each, 24 a page. Store staff are answered **307 to their Order panel by the request
   proxy** before anything renders (`apps/web/src/security/admin-landing.ts`; it was a 200 with a one-second
   refresh, a blank page on a phone).
3. **The custom views (16.3).** The Order panel, the Leads inbox, Import stock and the analytics view restyled from
   tokens, behaviour unchanged; lists are one paper panel of ruled rows (orders 50 a page), native selects, file and
   date inputs themed, every view a `<main>` on the shell's gutter.
4. **From the finish review (16.4).** The sidebar is open on a laptop (Payload closed it on every load at 1440 px
   and under; `packages/cms/src/admin/nav-open.jsx`); short dates (`9 Oct 2026, 22:34`); prices read `Rp 95.000`
   in lists; the default list columns fit at 1280 beside the sidebar; the antique record opens with First edition,
   Date on the plate, Publication, Physical record, Rights, From the old site and SEO folded (no data change); a
   phone's record header whole (the breadcrumbs drop the page's own title; the status line wraps); the account page
   no longer 75 px too wide on a phone (Payload's settings rules).

No field, label, flow or access rule changed. `check:generated`: no drift (`payload-types.ts` unchanged by the
folds; `importMap.js` regenerated for the Wall, the marks and the price cell). One dependency added:
`@payloadcms/ui@3.90.2` in the cms package (the same copy the app links, for the sidebar's context).

## The finish review (impeccable-finish-reviewer)

| Round | Set                      | Disposition | What it found                                                                                                                                                                                                                                                      |
| ----- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | 30 staging screens       | recapture   | the store landing malformed (a real defect: the meta refresh), unloaded lazy images, a chip out of view                                                                                                                                                            |
| 2     | recaptured set           | fix         | 8 material fixes: no sidebar on a desktop, cards for lists, a filter button reading "All", Cormorant figures and a stretched panel on analytics, a phone's record header clipped, list columns cut at 1280 and a raw price, the browser's own controls, long forms |
| 3     | full set after the fixes | fix         | 1–5 resolved; the price formatted by language, a filled select arrow, more groups to fold; the Wall's search wrapping beside the sidebar, the wide views off the shell's gutter                                                                                    |
| 4     | full set after round 3   | fix         | all resolved but one: the antique record still long, most of it the AI-draft checks drawn empty on a hand-catalogued work (now shown only for what was drafted; the publish guard and audit unchanged, their database tests 10/10)                                 |
| 5     | full set after round 4   | **ship**    | the record 5,313 px (7,375 the round before); no regressions                                                                                                                                                                                                       |

## Checks

- **Phones and laptops, staging `production-20261011T094100Z-f23ab4d1`:** the owner (13 screens) and a store user (2) at 390 and 1280, the sign-in
  signed out: **0 px sideways overflow on every screen**.
- **axe on staging** (owner and store user, 390 and 1280, **English and Indonesian**, 72 page loads): every screen
  the redesign owns is clean — the Wall (unfiltered, Needs attention, an empty search), the Order panel, the store
  queue, the Leads inbox, Import stock and analytics: **0 violations**; the store user's order page 0 too.
  Contrast is clean everywhere. Payload's own list, record, settings and account screens keep the structural debt
  the foundation gate recorded as **F6** (2026-10-05): unnamed popup and pager buttons, react-select inputs and row
  checkboxes without labels, landmark duplicates. The redesign did not add to it (it is CSS on those screens) and
  removed F6's one contrast finding (`.localizer-button__label`). The sign-in's two moderate findings
  (`landmark-one-main`, `region`) are Payload's minimal template; the wordmark is now its banner.
- **The timed admin recipes on staging** (`tests/e2e/admin-usability/`, run `202610110900` and `202610110905`):
  R1 add and publish a product 11.7 s · R2 import stock 5.6 s · R3 work a lead 5.6 s · R4 the store user to
  Delivered 9.0 s at 1280 and 8.5 s at 390 (unaided, landing on the Order panel) · R5 the delivery-band fees edited
  and put back 2.3 s · R5b the owner prices an order 3.4 s / 4.2 s · R6 a replacement order 4.1 s — **all pass**.
  The recipes' own drift fixed on the way: the dashboard cards they clicked are the Wall now (they open the sidebar
  link, once Payload has hydrated it); Site settings is a tab per site since 15.3; R1 starts in the default content
  locale.
- **Unit and static:** format, lint, typecheck, the token lint, file size and generated files pass; the unit tests
  2,744 pass (one database test, `instance.test.ts`, timed out once under the full parallel run and passes alone,
  5/5). The landing's own test runs it through the adapter Next runs the proxy in, and fails on the first attempt's
  code (which answered 500 on staging).

## Releases to staging

`339ab525` (the phase) · `f009ed3a` (phones) · `75dbc817` (the proxy landing: 500, a relative `Location`) ·
`ea5b2e24` (fixed) · `01b5055a` (the review's round 2) · `0eab0689` (round 3) · `f23ab4d1` (round 4, shipped).

## Screens

`docs/gates/admin-redesign/shots/final-*.png`, staging `f23ab4d1`: the owner's Wall, the Antiques list, an
antique record, the Order panel, Site settings and analytics at 1280; the Wall, an antique record and the Order panel
at 390; the store user's landing and an order at 390; sign-in at 390. `final-local-editor-*`: the e2e editor's Wall on a local build of the same code (staging has no editor account) — unfiltered, Needs attention, each site, a search and an empty result at 390 and 1280 were all axe 0 and 0 px overflow, the strip without New leads (owner-only). `panels-after-*` are 16.3's before and after.

## Left as it is

- Staging's first Wall pages are REHEARSAL 10.4 test drafts whose pictures are admin screenshots the timed recipes
  upload; real works follow them.
- Payload's F6 markup debt (above): a component-level change to Payload, not this redesign's.
