# Design system — one engine, two looks

How two storefronts that must feel nothing alike share one engine without
sharing a look. This is the **mechanism**. Each look's aesthetic brief lives with
its storefront app — `engine/apps/gallery/DESIGN.md` and
`engine/apps/emporium/DESIGN.md`, written in Phase 1 after the owner picks a
direction — and the behaviour of each site is in EXPERIENCE-GALLERY.md and
EXPERIENCE-SHOP.md.

---

## 1. Three layers, and what each may decide

| Layer | Where | Decides | May not decide |
| ----- | ----- | ------- | -------------- |
| **Primitives** | `@engine/ui` | behaviour and accessibility: dialog, sheet, drawer, tabs, disclosure, combobox, radio group, carousel, toast, zoom-viewer shell, price, form fields — **unstyled**, token-driven | colour, type, spacing values, composition |
| **Storefront app** | `engine/apps/gallery` · `engine/apps/emporium` | the look, the route tree and the composition of every surface: layout, typography, imagery, motion, which blocks sit where | what data exists, prices, availability, stock, taxes |
| **Brand** | `<brand>/site/` | identity inside the app: logo, marks, a validated subset of tokens, copy | anything structural |

Each app is a complete, opinionated design — the gallery and the emporium do not
share a single visible component. What they share is underneath: the same
accessible primitives, the same view models, the same loaders, the same commerce
API, the same budgets.

## 2. Surfaces — the pages the engine guarantees

The engine defines the **surfaces** (a view model plus a loader each); an app
must render every surface its brand's modules switch on — the app declares its
`supports` list and config validation enforces it. Route files in an app are
thin: resolve params, call the loader, render the app's own surface component.

```tsx
// engine/apps/gallery/src/app/(site)/[locale]/item/[idSlug]/page.tsx
// public URL /product/1706-bali-island-… → rewritten here by the proxy (C10)
import { loadItem } from '@engine/loaders/item'
import { ItemSurface } from '@/surfaces/item/item-surface'

export default async function Page({ params }: PageProps<'/[locale]/item/[idSlug]'>) {
  const { locale, idSlug } = await params
  const result = await loadItem({ locale, ...parseIdSlug(idSlug) })  // published only, projected
  if (!result) notFound()
  if ('redirectTo' in result) permanentRedirect(result.redirectTo)  // the slug changed: 301 by id
  return <ItemSurface vm={result.vm} />                              // the app's own design
}
```

Routes carry **no segment config** (Cache Components forbids it — ARCHITECTURE.md
§9); anything reading cookies, headers, the ship-to market or availability does so
inside `<Suspense>`.

| Surface | View model | Notes |
| ------- | ---------- | ----- |
| `Home` | `HomeVM` | bands ordered by the CMS homepage global — reordering is an edit, not a deploy |
| `Browse` | `ListingVM` | facets, counts, sort, pagination; named facet URLs (`/antique-maps/java`) |
| `Search` | `SearchVM` | works with JavaScript off; synonyms and historical place names |
| `Item` | `ItemVM` | **one PDP view model for every product**; `purchase` is a union: `unique` · `variants` · `enquiryOnly` |
| `Design` | `DesignVM` | one artwork, every product made from it (`catalogue.productTypes`) |
| `Maker` | `MakerVM` | cartographer / engraver / publisher / photographer |
| `Place` | `PlaceVM` | region page, historical and modern names, what was mapped there |
| `Collection` | `CollectionVM` | curated groupings ("Spice Islands", "Hofker's Bali") |
| `Source` | `SourceVM` | a bibliography entry and the works citing it |
| `Exhibition` | `ExhibitionVM` | a fair, exhibition, viewing or pop-up |
| `Location` | `LocationVM` | a gallery or the showroom: hours, map, booking, "in the showroom now" stock |
| `Ig` | `IgVM` | the shop's "link in bio" page — posts curated in the CMS (an image + the products it shows); an Instagram API feed is v2 |
| `GiftCard` | `GiftCardVM` | choose, schedule for a recipient, check a balance |
| `NewsletterArchive` | `NewsletterArchiveVM` | past issues as HTML pages |
| `Story` | `StoryVM` | journal article from blocks |
| `Catalogue` | `CatalogueVM` | web-native catalogue with live availability (`content.catalogues`; the printable PDF is v2) |
| `Page` | `PageVM` | about, visit, FAQ, shipping, returns, policies — CMS pages from blocks |
| `Cart` | `CartVM` | page and drawer share one VM |
| `Checkout` | `CheckoutVM` | steps are data (COMMERCE.md §5), not separate surfaces |
| `Order` | `OrderVM` | confirmation, and the account's order detail |
| `Account` | `AccountVM` | overview · orders · wishlist · want-lists · addresses · profile — and, for the gallery, **my offers** (with counter countdown), holds, price requests, viewings (reschedule, cancel, `.ics`), consignments (status timeline) |
| `Form` | `FormVM` | enquiry · offer · consignment · appointment · wholesale — one engine, config-driven fields |
| `Pay` | `PayVM` | the landing page of a staff-sent payment link (accepted offer, hold, WhatsApp sale): the item, the terms, the expiry, the seller's identity, the routed methods |
| `Quote` | `QuoteVM` | a business or institutional quote / proforma: lines, validity, PDF, accept → pay |
| `OrderLookup` | `OrderLookupVM` | guest order tracking by order number + email or WhatsApp number, with the courier timeline |
| `NotFound` · `Gone` · `Error` | — | designed, not defaulted: a legacy `/product/{id}-{slug}` miss turns the slug into a prefilled search with similar works; `410 Gone` for an item removed from inventory (sold items are **not** gone — they stay live); a 500 page with WhatsApp contact |

`Order` includes the **payment-pending** state, the most important page in an
Indonesian checkout: the exact amount, the VA number with a copy button,
step-by-step instructions per bank app (m-BCA, Livin', BRImo, ATM), the expiry
countdown, the bank daily-cap warning, "we'll WhatsApp you when it's paid", and an
automatic switch to *Paid* when the payment lands. A QRIS code on a phone cannot be
scanned by the same phone, so the page offers **save QR to gallery** and e-wallet
deep links. Failed, expired and cancelled-redirect payments retry with another
method **without losing the bag**.

**Every surface is designed before it is built.** Phase 1 comps the two signature
surfaces at full fidelity; every other surface gets an impeccable **surface
brief** (`shape`) with its mode — the item page is *Experience*; browse, checkout
and the admin are *Operate*; stories and trust pages are *Read*; the shop's home
and For Business are *Persuade* — before an agent writes its route (TASKS.md 3.9).

The **shell** (header, navigation, footer, announcement bar, consent banner,
the locale switcher, the **ship-to selector** — which decides the currency; there
is no free currency switcher, because an Indonesian destination must show rupiah
alone — cart indicator, sister strip) is the app's root layout, fed by `ShellVM`,
which also carries the runtime analytics ids and brand assets.

What an app may **not** contain: a Payload import outside its `(payload)` admin
mount, a database query, a price calculation, a stock check, or a brand name or
brand copy (message **values** live in `<brand>/site/copy`; the app defines keys).
Its `src/app/api/x/**` files are one-line re-exports of `@engine/http` handlers,
checked for parity in CI; its `src/proxy.ts` re-exports the engine's proxy
handler and declares its `matcher` literally, because Next analyses it statically.

## 3. View models, fixtures, and why app components never see Payload

`@engine/view-models` (contract C2) holds every VM type and a **typed fixture**
for each (`fixtures/item-unique.ts`, `fixtures/item-variants.ts`…). App
components are built, reviewed and tested against fixtures and **never against
the database**. When the schema lands, `@engine/loaders` maps Payload documents
onto the same VMs; no component changes.

Loaders read **as the public**: `overrideAccess: false`, `_status: 'published'`,
and a `select` of exactly the fields the view model needs — so a draft can never
render and a private field (acquisition cost, consignor, location) can never reach
a component (ARCHITECTURE.md §12). The fixture source exists for development and
component tests only; the boot check refuses `LOADERS_SOURCE=fixtures` in
production.

View models are **resolved and honest**:

- relationships arrive populated, uploads flattened to the media contract (C9) —
  no component ever handles `string | Media | null`;
- money arrives as `Money` (C5) and is formatted by `@engine/i18n`'s
  `formatMoney(locale)` — a component never does arithmetic on a price;
- imprecise facts arrive with their precision (`{ year: 1750, precision: 'circa' }`)
  and the component must render it (`c. 1750`) — never imply certainty the
  record lacks (a KOI principle, and on an antique a legal one);
- absent data is `null`, and a surface with nothing real to show omits the band
  rather than inventing one (NOW! S2: _no fixture content in shipped code_).

If a component needs a field the VM lacks, the change goes VM first, fixture
second, loader third — through ARC. Reaching past the fixture for a document is
how the lanes quietly re-couple.

**Fixtures cover states, not just the happy path.** Every surface has one fixture
per state — loading/streaming, empty, partial (a band omitted because its data is
null), error, JavaScript off, long content (Dutch titles, a 300-character Latin
transcription, text expanded 30% for the future Dutch locale), extreme values
(`Rp 1.250.000.000` in a price line), and a phone-width image at aspects 0.3, 1
and 3.5 (tall costume prints to coastal profiles). The `/style-guide` has a
state switcher (TASKS.md 3.8).

**`ItemVM.purchase` is viewer-relative.** Besides the item's own status it carries
the viewer's relation to it — *held for me*, *in my checkout*, *my offer is
pending / countered*, *held by someone else*, *sold* (and *price realised* for
signed-in buyers) — crossed with export status and the ship-to destination, so the
purchase panel can render a **designed state for every combination** (a
`domestic-only` Jakarta item seen from Singapore reads "Available for delivery
within Indonesia · View it in Jakarta", never a disabled Buy button).

**Books are not flat sheets.** `ItemVM` carries a `book` part for books and atlases
— binding, pagination and plates, completeness, openings, spine and cover views —
so the item page renders collation for a volume, not for a map.

## 4. The token contract (C3)

Every app defines every token below. Components use roles, never raw values.

| Group | Tokens |
| ----- | ------ |
| Colour roles | `--c-ground` · `--c-surface` · `--c-surface-deep` · `--c-ink` · `--c-ink-soft` · `--c-rule` · `--c-accent` · `--c-accent-ink` · `--c-focus` · `--c-positive` · `--c-caution` · `--c-critical` |
| Type families | `--font-display` · `--font-text` · `--font-ui` · `--font-numeric` |
| Type steps | `--t-hero` · `--t-display` · `--t-title` · `--t-lede` · `--t-body` · `--t-small` · `--t-micro` (fluid where it matters) |
| Measure & space | `--measure` (one reading measure) · `--space-1…9` · `--gutter` |
| Shape | `--radius-control` · `--radius-card` · `--rule-hair` · `--rule-strong` |
| Motion | `--dur-in` · `--dur-out` · `--ease` · `--reveal-distance` |

**Brand-overridable subset:** `--c-accent`, `--c-accent-ink`, `--c-ground`,
`--c-ink`, and the display family when the brand licenses one. Overrides are
injected at runtime from brand config and validated at build and boot: every
text pairing must clear WCAG AA against the grounds it sits on, or **the whole
override is rejected** and the app default renders (KOI's contrast gate —
replacing one failing colour produces a site in two schemes, which looks like a
bug rather than a fallback).

**Secondary text is derived, never faded.** `--c-ink-soft` is computed by mixing
ink toward the deepest surface as far as it can go while clearing AA — no
`text-ink/60` anywhere (KOI measured one at 3.15:1). A new tinted surface is a new
rung in the surface ladder, never an ad-hoc opacity.

Tailwind v4 registers the roles with `@theme inline`, so `bg-accent` compiles to
`var(--c-accent)` and re-declaring a property re-skins everything beneath it.

The admin (`/admin`) wears the brand too — KOI's owner asked for a CMS that
matches the public site's world rather than a neutral admin — through the same
token roles applied to Payload's admin CSS variables, **constrained to chrome and
accents**: brand colour never on dense tables or form fields, where it costs
legibility over long sessions.

**Dark mode — decided: the storefronts have none.** Paper on a warm mat *is* the
product; a dark theme would misrepresent every sheet's tone. No agent adds
`prefers-color-scheme` styles to either storefront. Two exceptions: the viewer's
full-screen lightbox is a dark surface rung (so the sheet reads against it), and
the admin either tokenises Payload's dark theme to AA or disables its toggle —
decided in Phase 1 (TASKS.md 1.10). Emails are designed to survive dark-mode mail
clients that invert colours.

## 5. Content blocks (C4) — the frozen list

Rich content is runs of named blocks, not one open rich-text field — an editor
choosing from named shapes produces pages that look designed (KOI).

| Block | Carries |
| ----- | ------- |
| `prose` | rich text (Lexical), headings, lists, inline links to items/makers/places, and **note marks** — footnotes/sidenotes that can cite a source (rendered as sidenotes on wide screens, footnotes on phones) |
| `figure` | one image, caption, credit, `width`: `measure` · `wide` · `full` |
| `zoomFigure` | a **region of a work** ("see the cartouche") — a crop that opens the viewer at those IIIF coordinates |
| `compare` | two images side by side or on a slider — two states of one plate, then and now |
| `shoppableImage` | an image with hotspots linking to products (the shop's rooms and flat-lays) |
| `gallery` | 2–12 images, layout hint, captions |
| `pullQuote` | quote, attribution, optional source |
| `productRail` | hand-picked products, or a saved query (facet selection + sort + limit) |
| `timeline` | entries `{ year, precision, label, note }` |
| `callout` | a note, a condition warning, a shipping notice — tone `info` · `caution` |
| `faq` | question/answer pairs → accessible disclosure + `FAQPage` JSON-LD |
| `cta` | label, destination, style `primary` · `quiet` |
| `embed` | video, or the full IIIF viewer of a work |
| `newsletter` | the signup unit with its source key |
| `divider` | section break, optional localised title |

Fifteen blocks. The three after `figure` exist because the gallery's essays are
its voice, and without scholarly primitives a story reads like a blog post.

`@engine/view-models/src/blocks.ts` is the union. SCH writes the Payload
definitions from it; each app writes one renderer per block; the map is
exhaustive, so adding a type without a renderer in **both** apps is a compile
error.

## 6. The component gallery

Each app serves `/style-guide` (noindex, deployed, because design review happens
on real phones — not `/_gallery`: an underscore folder is private in the App
Router and would not route): every component, every surface, every block and
every state, rendered from fixtures, with a picker for brand token overrides, a
toggle for each module and a state switcher. It is where Phase 3 is reviewed and
where visual tests take their snapshots.

## 7. Budgets — enforced in CI

| Metric (reference device, 4G) | Browse / Home | Item | Checkout |
| ----------------------------- | ------------- | ---- | -------- |
| LCP | < 2.5 s | < 2.5 s (the primary image is the LCP, preloaded) | < 2.5 s |
| INP | < 200 ms | < 200 ms | < 200 ms |
| CLS | < 0.05 | < 0.05 | < 0.05 |
| Initial JS (gzip, first-party) | < 150 KB | < 180 KB — **the zoom viewer and the configurator's preview load on intent** | < 200 KB (provider SDKs counted separately, loaded only on the payment step) |

**Reference devices, named:** a Samsung Galaxy A15 or Redmi Note-class Android
for the phone budgets, Lighthouse's mobile throttling for CI, and a real-device
check on Telkomsel 4G in Bali before each storefront phase closes — not only in
Phase 13.

**The configurator is content, not an enhancement.** On the shop's product page
the options *are* the page: they are server-rendered as real radio groups inside
a GET form (it works with JavaScript off, and the URL encodes the
configuration), then hydrated progressively. Only the **preview layer** loads on
intent. The destination's price table ships with the page so the price updates
instantly on the client — display only; the cart re-prices on the server
(COMMERCE.md §1). The preview is a pre-sized image (~1200 px AVIF), frames as
9-slice SVG/CSS layers, pre-composited room plates per wall colour and "to scale"
as SVG — never the scan redrawn on a canvas.

Images: AVIF + WebP ladder, dimensions always reserved, blur placeholder from
the media record. No image is served larger than its rendered size × DPR. The
`Save-Data` header selects a smaller ladder and disables autoplay — metered data
is common in Indonesia. **Fonts:** at most three font files on first paint per
app, subset for Latin with Indonesian and Dutch diacritics, and checked against
real original titles (long s `ſ`, ligatures, accents); a CJK plan for the later
Chinese locale is written into DESIGN.md, not improvised.

**Availability never flashes.** Content shells are cached while availability is
dynamic (ARCHITECTURE.md §9), so the purchase panel reserves its height and reads
"Checking availability…" until the dynamic part resolves; **no purchase control
renders before availability is known** — a sold map must never flash "Buy".

## 8. Motion

1. **Out is faster than in** — in 280–360 ms, out 180–220 ms (KOI).
2. One easing family per app, declared as `--ease`.
3. Nothing animates that the visitor did not cause, except one declared idle
   motion per app (if any).
4. `prefers-reduced-motion` is honoured absolutely: transitions become
   cross-fades or cuts. **No exceptions, no "but this one is subtle".**
5. Every animation is interruptible. No scroll hijacking, ever; the plain wheel
   always scrolls the page.
6. No animation library by default. CSS, the View Transitions API for
   grid → item continuity, and small client components for what CSS cannot
   express (NOW! Edition 2 shipped "proper animation" this way).

Rules are not choreography. Each app's DESIGN.md names **at most six motions**,
each with its trigger, duration, easing and reduced-motion fallback — candidates:
grid → item transition, viewer open/close, recto ↔ verso flip, a frame or mount
changing in the configurator, the bag drawer, and the moment an item turns *held*
or *sold* in front of the viewer.

## 9. Accessibility floor — acceptance, not a later pass

WCAG 2.2 AA. Keyboard-complete, focus always visible, targets ≥ 24 px (44 px on
touch), `lang` set per locale. Specific to commerce:

- **Status is text, never colour alone** — "Sold", "On hold", "Reproduction",
  "Only 2 left" (and only when true).
- The zoom viewer has keyboard pan/zoom, a reset control and a text alternative;
  everything it shows is also in the page as text.
- Variant and frame choices are real radio groups; the price change is
  announced politely; the preview is `aria-hidden` decoration over a text
  summary of the selection.
- Forms: visible labels, errors that explain and instruct, never cleared on
  error, 16 px inputs so iOS does not zoom.
- The checkout works at 200% zoom and with a screen reader, end to end, in both
  brands. That is an e2e test, not a hope.
- **Dragging always has an alternative** (WCAG 2.5.7): number inputs beside every
  range slider; buttons for viewer pan and zoom.
- **Focus is never obscured** (WCAG 2.4.11). The bottom of a phone screen is one
  slot with a priority order — the sticky buy bar, then the consent banner, then
  the language banner; WhatsApp merges into the buy bar on product pages; the
  welcome offer never appears before first engagement; no exit-intent pop-ups on
  phones. An e2e test tabs through a product page with every bottom element open.
- Frame and colour swatches carry names and ≥ 24 px targets; the dominant-colour
  filter has text labels; display faces like Limelight only at ≥ 32 px and never
  for body text or long Indonesian compounds.
- The storefronts are tested in the **Instagram, WhatsApp and TikTok in-app
  browsers** (the shop's main traffic arrives there) as well as Safari and Chrome;
  a payment step that cannot complete in a webview says so and offers "open in
  your browser".

## 10. Honesty rules — design constraints, not copy suggestions

- **A reproduction is always labelled a reproduction**, on the card and the PDP,
  and says what it reproduces and where the original is. Confusing merchandise
  with an original is a consumer-protection problem, not a styling one.
- **No invented urgency.** No countdowns that reset, no "12 people are looking".
  A one-of-one item says "One of one" because it is.
- Sold items stay visible as sold (they are the gallery's reputation and its
  SEO) and turn demand into a want-list, never into a dead end.
- Condition is shown as graded, with the defects the cataloguer recorded; the
  legend for the grading scale is one tap away.
- Dates carry their precision; attributions carry their certainty ("attributed
  to", "after").

## 11. Imagery

Photography decides perceived quality more than any component. Each app's
DESIGN.md carries its **image treatment** — box behaviour for extreme aspects
(contain on a mat, never crop a sheet), mat tone against toned paper, the contact
shadow, black-and-white and albumen photographs — and Phase 1 produces **capture
standards** per brand: lighting and colour temperature, a colour target in every
frame, the raking-light angle, minimum ppi, backgrounds, and the split between the
brands (the gallery: studio, object, raking light, no people; the shop: sun,
hands, rooms, packaging, the showroom).

Two honesty rules: **never retouch away a defect on an original** — the condition
report and the image must agree; and **synthetic mockups are labelled** as such
until real photography replaces them.

## 12. Switching ship-to, currency and locale

- Changing ship-to on an item re-renders price, export gating, the shipping
  estimate and the available actions, and announces the change politely.
- A bag that moves to an Indonesian destination re-prices to IDR with a visible
  notice — never silently.
- A locale switch maps the URL (`/product/…` ↔ `/id/produk/…`) and keeps the
  configurator's state.
- The language-suggestion banner has one fixed place in the bottom-edge order
  (§9) and remembers its dismissal.

## 13. Design quality gates

Functional gates cannot see a mediocre page. Every UI phase (3, 6, 7, 8, 13) closes
with a **design gate**: a senior-uiux agent runs impeccable `critique` and `audit`
on real-device screenshots at 360, 390, 768 and 1440 px, in English and
Indonesian, **against the approved comp**; zero P0/P1 findings may remain; and
the owner signs off the screenshot set. The result is recorded in
`docs/design/DECISIONS.md`.
