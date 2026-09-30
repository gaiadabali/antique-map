# Design system — one engine, two looks

How two storefronts that must feel nothing alike share one engine without
sharing a look. This is the **mechanism**. Each look's aesthetic brief lives with
its storefront app — `engine/apps/gallery/DESIGN.md` and
`engine/apps/emporium/DESIGN.md`, written in the Design stage after the owner picks a
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
  const publicId = parsePublicId(idSlug)             // the id alone: ASCII digits, or null
  if (publicId === null) notFound()
  const asked = await askedAddress()                 // the proxy's x-public-path, x-public-search
  const result = await loadItem({ locale, publicId, asked }) // published, projected
  if (!result) notFound()                            // a miss only the database can decide
  if ('redirectTo' in result) permanentRedirect(result.redirectTo)  // not the one address: a 308
  const purchase = await result.vm.purchase          // in the first flush: its forms work without JS
  return <ItemSurface vm={result.vm} purchase={purchase} />          // the app's own design
}
```

The route reads only the id from its segment: Next hands the page that segment
still encoded and `generateMetadata` the same one decoded, so no spelling of it is
compared. The page reads the address the visitor asked for from the proxy's headers
(`askedAddress()`, which refuses a request with no public path) and passes it to the
loader, which stays pure: C2's `Loaders.item` takes `{ locale, publicId, asked }`
(v1.3, TASKS.md 4.3.f). The loader's cached read is keyed by `(locale, publicId)`
alone; it compares `asked.path` with `href()`'s spelling byte for byte **outside**
its `'use cache'` read — never a cache argument, since each spelling a visitor chooses
would be a new entry — and on a mismatch answers `redirectTo` the current address with
`asked.search` appended, so an old link's query survives its 308. That is the rule of
`engine/apps/gallery/src/item/canonical.ts`, which the loader inherits (MIGRATION.md
§6; TASKS.md 11.3). A route with a slug takes it the same way, decoded, from C10's
parse of `asked.path`, never from `params` (CONVENTIONS.md §12).

Routes carry **no segment config** — the `(site)` layout's `instant = false` is the
one there is (ARCHITECTURE.md §9). What the first flush must carry — a form, its
current value, a post's result, the canonical check, and the purchase panel, whose
live availability decides its forms — is read in the page's own body, so buying works
without JavaScript; only slow reads no form depends on (related works, reviews) stream
inside `<Suspense>`, and a streamed part holds no form (CONVENTIONS.md §12).

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
| `Order` | `OrderVM` | confirmation, and the account's order detail; `status` is the buyer's derived `BuyerOrderStatus` (C6) — never the order's or a payment's raw state, so a dispute never reaches a buyer — and `conversion` (GA4/Meta's purchase value) is set only once, on a paid order's first confirmation |
| `Account` | `AccountVM` | overview · orders · wishlist · want-lists · addresses · profile — and, for the gallery, **my offers** (with counter countdown), holds, price requests, viewings (reschedule, cancel, `.ics`), consignments (status timeline). Where partners are the only accounts (the shop, D31): an approved partner's trade terms (D32), its quotes with a brief for a new one, and a reorder on each order — the only partner who signs in (D34) — and no shopper sign-up anywhere. Signed out: sign-in (one answer for every email), setting a password from an emailed link, and asking for one |
| `WantList` | `WantListPageVM` | the one page every alert link leads to (C10 `wantList`, module `retention.emailWantList`, D39): saves what its URL names — a signed-in buyer's account at once where `retention.wantList` is on, else an email address to confirm by double opt-in — and reads the list an email's link opened, so its holder can confirm or stop it; resolved, never streamed, so it works without JavaScript |
| `Form` | `FormVM` | enquiry · offer · consignment · appointment · hold · quote — one engine, config-driven fields, each kind posting its own C6 operation; a post without JavaScript comes back to its page (C13 `FORM_RESULT`) — received, sent back, rate-limited, or refused with its problem's sentence |
| `Pay` | `PayVM` | the landing page of a staff-sent payment link (accepted offer, hold, WhatsApp sale): the item, the terms, the expiry, the seller's identity, the routed methods |
| `Quote` | `QuoteVM` | a business or institutional quote / proforma, or an approved retailer's order at its trade tier (D32: the tier and minimum it was issued at, each trade price beside its list price): lines, validity, PDF, accept → pay |
| `OrderLookup` | `OrderLookupVM` | guest order tracking by order number + email or WhatsApp number, with the courier timeline |
| `Partnership` | `PartnershipVM` | the shop's one programme for every business buyer — shops, hotels, villas, cafés, companies (D31, D36; module `accounts.retailers`) — reached from the home hero's highlight and the header: what a partner gets, and a last section with the one application and partner sign-in, cached so both work without JavaScript. Over them streams what this visitor has: a sent application (one answer for all), a post sent back, an application waiting on staff, a declined one (with the form to apply again), or the way into a signed-in partner's area. It never shows a trade price |
| `Wishlist` | `WishlistVM` | the shop's saved items, kept on the guest's device with no account (D35, module `retention.deviceWishlist`): the list streams, each card's heart removes its item, and the page says where the list lives |
| `NotFound` · `Gone` · `Error` | `NotFoundVM` · `GoneVM` · `ErrorVM` | designed, not defaulted: a legacy `/product/{id}-{slug}` miss turns the slug into a prefilled search with similar works; an item removed from inventory renders the Gone design with a 404, noindex, and leaves the sitemap — a page cannot answer 410, so a real `410` comes only from the legacy handler (`/api/x/legacy/…`) for a rule that says so (sold items are **not** gone — they stay live); a 500 page with WhatsApp contact. The not-found loader tells a removed item from a miss by the public path the proxy passes on (C13). Without JavaScript: below |

**NotFound and Gone without JavaScript** (TASKS.md 4.3.d, measured on Next 16.3.6).
A request-time `notFound()` is answered with Next's recovery document —
`<html id="__next_error__">` with an empty `<body>` and no `lang` — and the designed
page is built in the browser from the RSC payload, so without JavaScript it is blank;
that is Next's behaviour with or without Cache Components. So the two kinds of miss
are answered differently:

- **A path that names no page** — most of them: an unknown or misspelt path, a page
  whose module is off, an internal path asked for directly — is the proxy's own
  not-found, decided without the database. The proxy rewrites it to
  `/<locale>/not-found` **with a 404** (C13 `PROXY_NOT_FOUND_STATUS`), which Next keeps
  through a normal render, and that route's page renders the designed NotFound
  surface in its own body — it never calls `notFound()`. The answer is a 404 whose
  HTML holds the brand's shell, `lang`, the surface and its search form, all working
  without a script (measured: 404, full body, where `notFound()` gave an empty one;
  confirmed by 4.3's senior-fe review). Under a 404 status Next takes the metadata
  from the `not-found.tsx` boundary's `generateMetadata`, never from a page's, so the
  NotFound title and description — localised — are that boundary's, the not-found
  page exports none, and Next adds `noindex` itself. The 404 depends on the proxy's
  User-Agent and status (TASKS.md 5.3), which a page cannot set; a client navigation
  to such a path costs two requests (an RSC 404, then a document load), which is
  acceptable. The status spec asserts the body too, not only the status.
- **A miss only the database can decide** — an item id that is no product, a draft, a
  removed item's Gone — calls `notFound()` from its page: crawlers get the 404 and
  `noindex`, and the `not-found.tsx` boundary renders the same NotFound or Gone surface
  from the RSC payload, which needs JavaScript. Accepted: a page can set a 404 only
  through `notFound()`, and a route handler rendering the surface instead could not
  use the app's components or styles (packages never import apps). The catch-all for a
  surface this app has not built yet (`[...missing]`) calls `notFound()` too; by
  launch, every surface a brand's modules switch on exists.

`Order` includes the **payment-pending** state, the most important page in an
Indonesian checkout: the exact amount, the VA number with a copy button,
step-by-step instructions per bank app (m-BCA, Livin', BRImo, ATM), the expiry
countdown, the bank daily-cap warning, "we'll WhatsApp you when it's paid", and an
automatic switch to *Paid* when the payment lands. A QRIS code on a phone cannot be
scanned by the same phone, so the page offers **save QR to gallery** and e-wallet
deep links. Failed, expired and cancelled-redirect payments retry with another
method **without losing the bag**.

**Every surface is designed before it is built.** The Design stage comps the two signature
surfaces at full fidelity; every other surface gets an impeccable **surface
brief** (`shape`) with its mode — the item page is *Experience*; browse, checkout
and the admin are *Operate*; stories and trust pages are *Read*; the shop's home
and Partnership are *Persuade* — before an agent writes its route (TASKS.md 22.3).

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
  no component ever handles `string | Media | null`; an image carries its own
  `lang` when its alt or caption is not the page's locale (a Dutch caption, or
  a fallback that borrowed one), so a screen reader switches voice (WCAG 3.1.2);
- money arrives as `Money` (C5) and is formatted by `@engine/i18n`'s
  `formatMoney(locale)` on the server — a component never does arithmetic on a
  price, and never its rounding or its digits either: `formatMoney` pins an
  amount's fraction digits to `CURRENCY_EXPONENT` itself, never the runtime's
  ICU default, and a display **estimate** (`PriceVM.estimate`) carries none at
  all — a whole major unit, shown after "≈". Symbols and spacing still differ
  between the server's ICU and a browser's, so a Client Component receives the
  formatted string, never a `Money` to format (CONVENTIONS.md §6);
- imprecise facts arrive with their precision (`{ year: 1750, precision: 'circa' }`)
  and the component must render it (`c. 1750`) — never imply certainty the
  record lacks (a KOI principle, and on an antique a legal one);
- absent data is `null`, and a surface with nothing real to show omits the band
  rather than inventing one (NOW! S2: _no fixture content in shipped code_).

If a component needs a field the VM lacks, the change goes VM first, fixture
second, loader third — through ARC. Reaching past the fixture for a document is
how the lanes quietly re-couple.

**Two part-shapes carry the resolved/streamed split into the type system.** A
`Streamed<T>` is a part read at request time, which the page streams into a
`<Suspense>` boundary or awaits in its own body (ARCHITECTURE.md §9) — never
produced inside a cached read — and it **never rejects**: a failed read
resolves to its designed fallback (`null`, an empty list, `enquiryOnly` /
`unverified` for a purchase panel), so no error boundary ever stands in for a
panel; a fixture passes `Promise.resolve(…)`, or `pending()` for a streamed
band's reserved-height state. The item's `purchase`, typed `Streamed`, is
awaited in the page body (§2), so it never shows one. A
`CachedPart<T>` is a view model with every `Streamed` property, at any depth,
left out — what a loader's `'use cache'` + `cacheTag` read may return in
phase one, before phase two adds the request-time parts. **What a visitor
without JavaScript must see or act on is resolved, never streamed**: a form,
its post's outcome (`FormResultVM`, C13 `FORM_RESULT`), the purchase panel
and its forms, and the list an email's link opened are all awaited at request
time and rendered in the page's own body — never inside a nested `<Suspense>`
a script would be needed to reveal.

Each page's `SeoVM` also carries `contentLocale`: the locale its main content
is really in, which may differ from the page's own when it falls back to
another locale's text — the content itself then carries that `lang`, and the
borrowed locale's URL leaves `alternates`, since it is no translation
(ARCHITECTURE.md §11).

**Fixtures cover states, not just the happy path.** Every surface has one fixture
per state — loading/streaming, empty, partial (a band omitted because its data is
null), error, JavaScript off, long content (Dutch titles, a 300-character Latin
transcription, text expanded 30% for the future Dutch locale), extreme values
(`Rp 1.250.000.000` in a price line), and a phone-width image at aspects 0.3, 1
and 3.5 (tall costume prints to coastal profiles). The `/style-guide` has a
state switcher (TASKS.md 11.4).

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
**The contract is a floor, not a ceiling**: an app's own tokens are named
`--app-…`, so they can never collide with one ARC adds later, and the shared
primitives in `@engine/ui` read contract tokens only — never an app's.

| Group | Tokens |
| ----- | ------ |
| Colour roles | `--c-ground` · `--c-surface` · `--c-surface-deep` · `--c-ink` · `--c-ink-soft` · `--c-rule` · `--c-accent` · `--c-accent-ink` · `--c-focus` · `--c-positive` · `--c-caution` · `--c-critical` · `--c-viewer` · `--c-viewer-ink` (the deep-zoom viewer's full-screen surface — the one dark rung, below) · `--c-scrim` (the backdrop behind a dialog, sheet or the viewer) |
| Type families | `--font-display` · `--font-text` · `--font-ui` · `--font-numeric` |
| Type steps | `--t-hero` · `--t-display` · `--t-title` · `--t-lede` · `--t-body` · `--t-small` · `--t-micro` (fluid where it matters) |
| Measure & space | `--measure` (one reading measure) · `--space-1…9` · `--gutter` |
| Shape | `--radius-control` · `--radius-card` · `--rule-hair` · `--rule-strong` · `--focus-width` |
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
decided in the Design stage (TASKS.md 13.3). Emails are designed to survive dark-mode mail
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
toggle for each module and a state switcher. It is where the Design systems stage is reviewed and
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
the Launch stage.

**The configurator is content, not an enhancement.** On the shop's product page
the options *are* the page: they are server-rendered as real radio groups inside
a GET form (it works with JavaScript off, and the URL encodes the
configuration), then hydrated progressively. Only the **preview layer** loads on
intent. The destination's price table ships with the page so the price updates
instantly on the client — one row per variant, its display string formatted by
the server, looked up rather than summed or formatted (CONVENTIONS.md §6) —
display only; the cart re-prices on the server (COMMERCE.md §1). The preview is a pre-sized image (~1200 px AVIF), frames as
9-slice SVG/CSS layers, pre-composited room plates per wall colour and "to scale"
as SVG — never the scan redrawn on a canvas.

Images: AVIF + WebP ladder, dimensions always reserved, blur placeholder from
the media record. No image is served larger than its rendered size × DPR. The
`Save-Data` header selects a smaller ladder and disables autoplay — metered data
is common in Indonesia. **Fonts:** at most three font files on first paint per
app, subset for Latin with Indonesian and Dutch diacritics, and checked against
real original titles (long s `ſ`, ligatures, accents); a CJK plan for the later
Chinese locale is written into DESIGN.md, not improvised.

**Availability never flashes.** Content is cached while availability is read
live (ARCHITECTURE.md §9), and the page awaits the purchase panel in its body, so
the panel arrives in the first flush with availability known — or, when the read
times out, as `enquiryOnly` / `unverified`; **no purchase control renders before
availability is known** — a sold map must never flash "Buy".

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
shadow, black-and-white and albumen photographs — and the Design stage produces **capture
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
