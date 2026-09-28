# Brands — one engine, two storefronts

Two sister companies, two very different shops, one engine. This document is the
contract for **how they differ**: everything that is not listed here is identical
by construction. It is the NOW! principle (ARCHITECTURE.md §3.5 there) — _no
`if (site === 'bali')` in application code, ever_ — applied to commerce.

| | **Indies Gallery** (`indies-gallery/`) | **Old East Indies** (`old-east-indies/`) |
| --- | --- | --- |
| Sells | **Originals** — antique maps, prints, photographs, books (15th–20th c.) | **Merchandise** from the same archive — giclée prints, posters, cards, notebooks, textiles, homeware |
| Inventory | one-of-one (`unique`), ~9,500 held, ~2,090 listed today | stocked + print-on-demand variants (`stocked`, `pod`) |
| Buyer | collectors, institutions, interior designers, diaspora | tourists, expats, gift buyers, heritage fans, hotels/villas (B2B) |
| Ticket | USD 150 – 50,000+, many "price on request" | IDR 50k – 5m |
| Feel | a quiet reading room: the object leads, the interface recedes | a warm, giftable lifestyle shop with heritage credibility |
| Today | live Laravel store at `antiquemapsindonesia.com` (MIGRATION.md) | showroom at Jl. Gambuh 17, Denpasar + Instagram (~11K) + a WhatsApp catalogue; `oldeastindies.com` 301s to a Linktree, and old Squarespace product URLs Google still indexes now dead-end (MIGRATION.md §10) |

---

## 1. What differs — and where each difference lives

Six things, all of them configuration or data. Nothing else.

| # | Differs | Where it lives | Changed by |
| - | ------- | -------------- | ---------- |
| 1 | Content, catalogue, customers, orders | **its own Postgres database** (`ig_db`, `oei_db`) | editors, in the CMS |
| 2 | Identity: name, legal entity, contact, nav, footer, announcement bar, homepage layout | `brand.config.json` as the floor, **CMS globals** override (§3) | editors (globals) / deploy (file) |
| 3 | Look and page structure: storefront app, tokens, fonts, logos, imagery | `brand.storefront` → `engine/apps/<storefront>`; brand token overrides + assets in `<brand>/site/` | a deploy |
| 4 | Capabilities: which modules are on | `brand.modules` (§4) | a deploy |
| 5 | Money: sellers of record, currencies, tax regimes, payment providers, shipping and fulfilment providers | `brand.sellers`, `brand.money`, `brand.shipping`, `brand.fulfilment` + per-seller secrets | a deploy + Infisical |
| 6 | Hostname, database, process | `.gaiadeploy.yml` target + `shared/.env` (`BRAND`, `DATABASE_URL`) | provisioning |

**No forked code, no branches, no per-brand modules in `engine/`.** A behavioural
difference that cannot be expressed as a row above is a bug in the config
schema, and is fixed there.

## 2. A brand folder contains config, data and assets — zero application code

```
indies-gallery/                  old-east-indies/            test/
  README.md             ← what this brand is; links to its app's PRODUCT.md / DESIGN.md
  site/
    brand.config.json   ← validated in CI (schema) and at boot (secrets) — §3
    assets/             ← logo.svg, marks, favicons, OG base, fonts licensed to the brand
    copy/               ← the brand's voice: the EN/ID values for every message key the
                          app defines (the lexicon, TASKS.md 1.3), legal page seeds
  content/
    seed/               ← fixture + starter content (committed)
    legacy/             ← mappings and the item register (committed once signed);
      raw/              ← extracts from the old site (gitignored; agents read them via LEGACY_DATA_DIR)
  db/                   ← dumps (gitignored)
```

**Apps own keys; brands own words.** An app defines its message keys and
neutral defaults; the brand folder supplies the values — so brand voice never
sits inside `engine/` (where the brand-literal lint would rightly fail it), and a
third brand on the gallery app speaks its own voice, not Indies Gallery's.

**Brand assets are served at runtime.** `public/` and `next/font` are build-time
and per app, so a brand's logo, marks, OG base and licensed display face are
served from the brand folder shipped in the artifact (`BRAND_ROOT`) through an
engine route (`/brand-assets/…`, C13), and brand fonts load with a runtime
`@font-face`. The app's own design fonts stay in `next/font`.

### Storefront apps — named by archetype, never by brand

The two looks are different enough to need different page structures, not just
different skins, so each is its own Next.js app: **`engine/apps/gallery`** (a
catalogue of one-of-one objects) and **`engine/apps/emporium`** (a shop of
variant merchandise). They are named for what they are, not for who uses them:
the brand chooses one in `brand.storefront`, and a third sister brand could run
on the gallery app in its own colours without a line of app code.

An app owns its **UI and its route tree** — nothing else. Data comes through
`@engine/loaders` as view models, money moves through `@engine/domain` and
`@engine/payments`, the admin is `@engine/cms` mounted at `/admin`, and every
API route is a one-line re-export of an `@engine/http` handler (a parity test
fails CI if an app is missing one). The brand-literal lint covers the apps too:
**no brand name may appear in an app** — identity arrives from config at runtime.

Each app carries the design authority for the brand it was designed for:
`PRODUCT.md` (who it serves, what it must feel like — the impeccable product
schema KOI uses) and `DESIGN.md` (the visual world, written after the direction
is picked). They sit in the app because the design tooling resolves them from the
workspace whose files are being edited. The root `PRODUCT.md` covers the
platform and the admin, which both brands share.

## 3. The config spine — file as the floor, CMS as the override

Borrowed from NOW! SURFACES-PLAN S1.3, where it was proven by breaking the
connection rather than by reading the code.

- **Structural settings live in the file** and need a deploy: storefront, modules,
  locales, route segments, currencies, tax regime, providers. They change what
  the build contains or what money does; an editor must not be able to flip them.
- **Editorial settings live in CMS globals** with the file as the floor: nav,
  footer, contact, announcement bar, homepage bands, trust badges, WhatsApp
  message templates. `getBrandConfig()` merges global over file; **a missing or
  unreadable global falls back to the file and logs why** — the site never
  renders without a masthead because a global was empty.

`engine/packages/config` owns the zod schema, and validation is **split in two**,
because the build has no brand and no secrets:

- **`validateBrandConfigs()`** runs in CI over **every** brand folder: the
  schema, modules ⊆ the chosen app's `supports`, a rounding rule for every
  market currency, route-map completeness. It fails CI.
- **`bootCheck()`** runs when a process starts: secrets present for every
  configured provider, sandbox vs live keys matching the environment, the
  database reachable, `LOADERS_SOURCE` not `fixtures` in production. It fails the
  health check.

Importing the Payload config at build time must never throw for want of a brand.

Brand identity is **runtime** configuration (read from `BRAND` at boot, with the
brand folder shipped inside the artifact); the storefront app is the only
build-time choice. Nothing is baked from one brand's config into a build —
NOW! had a production incident from exactly that (a static build froze one
city's masthead into the shared image).

### `brand.config.json` — the shape

```jsonc
{
  "slug": "indies-gallery",
  "name": "Indies Gallery",
  "domains": { "production": "antiquemapsindonesia.com", "staging": "ig.gaiada.com",
               "aliases": ["indiesgallery.com"] },
  "storefront": "gallery",                             // engine/apps/gallery
  "identity": {                                        // the floors the CMS globals override (below)
    "contact": { "email": "…", "whatsapp": "+62…" },
    "social": { "instagram": "https://…" },
    "navigation": { "header": [{ "surface": "browse", "label": { "en": "Maps & Charts" } }],
                    "footer": [] }
  },
  "assets": { "logo": "logo.svg", "favicon": "favicon.ico", "ogImage": "og.png",   // <brand>/site/assets,
              "fonts": [{ "family": "…", "src": "fonts/….woff2" }] },               // served at /brand-assets/…
  "tokens": { "--c-accent": "#8a5a1f" },               // optional, validated overrides of the app's defaults
  "media": { "publicZoomMaxPx": 4096 },                // public deep-zoom tiles stop at this long edge (C9)
  "locales": { "default": "en", "supported": ["en", "id"] },  // default served unprefixed; the
                                                               // database always holds en, id, nl
  "routes": {                                          // C10: every surface's segment, per locale
    "en": { "item": "product", "browse": "browse", "search": "search", "maker": "makers",
            "place": "places", "source": "sources", "story": "stories", "location": "visit",
            "pay": "pay", "quote": "quote", "orderLookup": "track", "ig": "ig", "…": "…",
            "forms": { "enquiry": "enquire", "offer": "make-an-offer", "…": "…" } },
    "id": { "item": "produk", "browse": "jelajah", "search": "cari", "maker": "pembuat",
            "place": "tempat", "source": "sumber", "story": "cerita", "location": "kunjungi",
            "pay": "bayar", "quote": "penawaran", "orderLookup": "lacak", "ig": "ig", "…": "…",
            "forms": { "enquiry": "tanya", "…": "…" } },
    "facets": {                                        // named facet URLs: /antique-maps/java/batavia
      "path": ["objectType", "place"],                 // place segments are the gazetteer's slugs
      "vocabularies": {
        "objectType": { "en": { "map": "antique-maps", "print": "antique-prints", "photograph": "photographs" },
                        "id": { "map": "peta-antik", "print": "cetakan-antik", "photograph": "foto" } } }
    },
    "defaultSort": { "browse": "newest", "search": "relevance" },   // never written into a URL
    "legacyPrefixes": ["/category/", "/storage/products/"]  // → /api/x/legacy/…; never a live segment
  },
  "ids": { "workUidPrefix": "…", "stockNumberPattern": "^[MPF]\\.[A-Za-z0-9]+$" },
  "money": {                                           // every amount: integer minor units
    "base": "USD",
    "markets": [                                       // a market = destination group + currency
      { "id": "id", "destinations": ["ID"], "currency": "IDR" },
      { "id": "sg", "destinations": ["SG"], "currency": "SGD" },
      { "id": "eu", "destinations": ["NL", "DE", "FR", "BE"], "currency": "EUR" },
      { "id": "au", "destinations": ["AU"], "currency": "AUD" },
      { "id": "row", "destinations": ["*"], "currency": "USD" }
    ],
    "rounding": {                                      // price-point ladders, for DERIVED prices only
      "IDR": [{ "upTo": 100000, "step": 5000 }, { "upTo": 1000000, "step": 10000 },
              { "upTo": 10000000, "step": 50000 }, { "upTo": null, "step": 100000 }],
      "SGD": [{ "upTo": null, "step": 1000 }], "EUR": [{ "upTo": null, "step": 1000 }],
      "AUD": [{ "upTo": null, "step": 1000 }]
    },
    "fx": { "source": "ecb-reference",                 // percent, as exact decimal strings
            "bufferPct": { "IDR": "3", "EUR": "3", "SGD": "3", "AUD": "3.5" } }
  },
  "sellers": [                                         // merchant of record, chosen per order (COMMERCE.md §2)
    { "id": "sg", "entity": { "name": "…", "country": "SG", "registration": "UEN …" },
      "serves": { "stockLocations": ["singapore"], "destinations": ["*"] },
      "tax": { "regime": "SG-GST", "registered": false },
      "charge": ["USD", "EUR", "SGD", "AUD", "IDR"],
      "payments": ["stripe", "bank-transfer"],
      "methodOrder": ["card", "paynow", "bank-transfer"],             // method families, first to last
      "cardCeiling": { "amount": 1000000, "currency": "USD" },           // USD 10,000.00
      "insuredThreshold": { "amount": 100000, "currency": "USD" },       // above → quote + fine-art cover
      "documentPrefix": "SG" },
    { "id": "id", "entity": { "name": "PT …", "country": "ID", "registration": "NIB …" },
      "serves": { "stockLocations": ["jakarta"], "destinations": ["ID"] },
      "tax": { "regime": "ID-PPN", "registered": false },               // D4: off until confirmed
      "charge": ["IDR"],
      "payments": ["midtrans", "bank-transfer"], "methodOrder": ["va", "card", "bank-transfer"],
      "insuredThreshold": { "amount": 15000000, "currency": "IDR" },
      "documentPrefix": "ID" }
  ],
  "commerce": {
    "inventoryModels": ["unique"],
    "ttl": { "checkoutLockMinutes": 15, "lockMarginMinutes": 10, "checkoutLockMaxHours": 3,
             "holdDefaultHours": 48, "holdMaxHours": 72, "holdNoticeHours": 12,
             "offerHoldHours": 48, "offerCounterHours": 72, "invoiceHoldDays": 7 },
    "purchaseTiers": [                                 // in the base currency, minor units, ascending
      { "upTo": 500000, "primary": "buy", "secondary": ["enquire", "whatsapp"] },
      { "upTo": 2500000, "primary": "buy", "secondary": ["reserve", "offer", "enquire"] },
      { "upTo": null, "primary": "requestPrice", "secondary": ["viewing", "proforma"] }
    ]
  },
  "analytics": { "ga4Id": null, "metaPixelId": null },  // runtime values — never NEXT_PUBLIC_*
  "shipping": { "providers": ["dhl-express", "biteship", "quote", "collect"] },
  "fulfilment": { "providers": ["own-stock"] },
  "modules": { "catalogue.unique": true, "purchase.offers": true, "…": "§4" },
  "sisters": [{ "slug": "old-east-indies", "name": "Old East Indies",   // at most one
                "role": "merch-outlet", "baseUrl": "…" }]
}
```

Values above are illustrative; the schema is `@engine/config/schema` (C1), and
anything it cannot check alone — the rupiah rule, disjoint markets, a ladder per
derived currency, modules the app supports — `validateBrandConfigs()` checks in
CI (above). Every amount is integer minor units (IDR has none, USD two), so
`"cardCeiling": 1000000` is USD 10,000.00. A price-point ladder rounds a
**derived** price up to a multiple of the band's step — explicit and
product-type-table prices are entered at their price point and never rounded —
with bands close enough that rounding never adds more than a tenth.

The legal entities, domains, tax registrations and payment providers are **open
decisions** (PLAN.md § Open decisions) — the schema accepts every answer, so
nothing waits on them except the config rows.

**Sellers are why a brand can use more than one gateway.** Research (COMPLIANCE.md)
found that an Indonesian PT can only charge in rupiah and cannot self-serve
Stripe, that domestic Indonesian sales must be priced in IDR alone, and that
exporting 100-year-old antiques from Indonesia needs clearance. A gallery with a
Singapore company and a Jakarta gallery therefore sells through **two sellers of
record** — and a merch shop selling to tourists may too. The engine routes each
checkout to one seller from the stock location and the destination; everything
the buyer sees about who is selling, in which currency, with which taxes and
payment methods, follows from that one choice.

## 4. Module flags — capabilities, never brands

A module is a capability the engine has for every brand. The flag decides
whether this brand's admin shows it, its routes resolve, and its surfaces render.
**Schema is identical in both databases whether a module is on or off** (§6) —
a flag may change `admin.hidden` and access, never which collections, fields,
blocks, select options or locales exist (ARCHITECTURE.md §2).

| Module | What it switches on | IG | OEI |
| ------ | ------------------- | :-: | :-: |
| `catalogue.unique` | one-of-one items: checkout lock, sold archive, "notify me of similar" | ✅ | — |
| `catalogue.variants` | variant axes, SKUs, stock | (books) | ✅ |
| `catalogue.productTypes` | product-type templates that generate variants from a design | — | ✅ |
| `purchase.offers` | make an offer → accept / counter / decline → private pay link | ✅ | — |
| `purchase.holds` | staff-granted reservations with expiry | ✅ | — |
| `purchase.requestPrice` | price-on-request items + request flow | ✅ | — |
| `purchase.invoices` | proforma invoice, bank transfer, PO number (institutions, B2B) | ✅ | ✅ |
| `media.deepZoom` | IIIF tiles + zoom viewer on the PDP | ✅ | ✅ (detail) |
| `media.roomView` | "on the wall" scale preview | ✅ | ✅ |
| `configurator.framing` | size × paper × frame × mount configurator with live preview | — | ✅ |
| `content.makers` | cartographer / engraver / photographer pages | ✅ | ✅ (credits) |
| `content.gazetteer` | region pages, historical ↔ modern place names in search | ✅ | ✅ |
| `content.catalogues` | curated digital catalogues + printable PDF | ✅ | — |
| `content.journal` | stories / articles | ✅ | ✅ |
| `content.exhibitions` | fairs, exhibitions, events calendar | ✅ | ✅ |
| `content.linkInBio` | the `/ig` link-in-bio page: CMS-curated posts and the products each shows | — | ✅ |
| `services.consignment` | "sell to us" submissions with photos | ✅ | — |
| `services.appointments` | book a gallery / showroom visit | ✅ | ✅ |
| `services.wholesale` | trade / hotel / corporate gifting enquiries and tiers | — | ✅ |
| `retention.wishlist` · `.wantList` · `.newsletter` | saved items · saved-search alerts · digest | ✅ | ✅ |
| `retention.reviews` · `.backInStock` · `.abandonedCart` | product reviews · restock alerts · recovery email | — | ✅ |
| `commerce.giftCards` · `.giftWrap` · `.discounts` · `.bundles` | | — / — / ✅ / — | ✅ |
| `fulfilment.pod` · `.clickAndCollect` | print-on-demand routing · pickup at the gallery / showroom | — / ✅ | ✅ / ✅ |
| `sister.links` | "own the original" ↔ "get a print" cross-links and work sync | ✅ | ✅ |
| `ai.cataloguing` | vision-assisted draft cataloguing in the admin, always human-verified | ✅ | ✅ |
| `channels.marketplaces` | Tokopedia / Shopee / TikTok Shop sync — **later** | — | later |

## 5. Sisters — cross-brand without cross-database joins

The two catalogues are related — every OEI design comes from a work in the IG
archive — but they live in separate databases owned by (possibly) separate legal
entities. The rule, from NOW!'s syndication design: **copy with provenance,
never join across databases on a request path.**

- Indies Gallery is the **origin** of works. It exposes a signed, read-only
  archive API and emits `work.published`, `work.updated`, `work.availability`
  and `work.unpublished` webhooks — the last so a copy stops linking to an
  original the origin took down without waiting for the nightly reconcile.
- Old East Indies stores a **provenance copy** of each work it uses
  (`works.origin = { brand, id, syncedAt }`). Edits flow origin → copy; the copy
  is read-only in the OEI admin except for OEI-only fields (crop, design notes).
- Links are rendered from the copy: _"The original of this print is in the
  Indies Gallery collection — available / sold"_ on OEI; _"Prints of this map
  from Old East Indies"_ on IG. Availability is at most one webhook stale, and
  the link text never claims more certainty than the copy has.
- **Customer accounts, carts, newsletters and consents are never shared.** They
  belong to different companies under UU PDP / PDPA. A shared sign-in is a
  later, consented feature, not a default — so every cross-link says so ("Old
  East Indies is our sister shop — a separate store with its own account") rather
  than surprising a buyer at sign-in.
- **The sister system is designed once, as pairs** (TASKS.md 1.6): a shared
  lockup ("From the Indies Gallery archive" / "An Indies Gallery company"), the
  shared Archive No. / stock-number tag, and each cross-link component — sister
  strip, "own the original", "get a print" — drawn in both brands' worlds.
- Sister links obey the destination rules on the page they appear on: an
  original's price shown in the shop follows the visitor's market currency (IDR
  for Indonesian delivery) and its export status (no buy route abroad for a
  `domestic-only` original).
- Master scans are the one shared asset: stored once in the private masters
  bucket, referenced by both by their storage key (C9 `masterKey()`, carried in
  the C12 snapshot — never a presigned URL; ARCHITECTURE.md §7), licensed from
  IG to OEI — the licence is a business matter recorded on the work, not a
  technical one.

## 6. Keeping them identical — enforcement

The rule is only real if it is enforced mechanically:

- **`pnpm lint:brand-literals`** fails the build on any brand slug, name or
  domain under `engine/` (CONVENTIONS.md §1).
- **One migration set** (`engine/packages/cms/src/migrations`) applies to every
  brand database. `pnpm db:schema-hash --all` compares them; CI fails on any
  difference. Zero manual DDL on a brand database, ever.
- **The synthetic `test` brand** turns on every module each app supports and
  runs on **both** storefront apps in CI — as **two configs**
  (`test/site/brand.gallery.json`, `test/site/brand.emporium.json`, selected by
  `TEST_STOREFRONT`) with a test database per app, since one config names one
  storefront and the apps support different modules. If anything is implicitly
  shaped like one real brand, it fails there first.
- **No config drift**: CI regenerates the Payload migration snapshot and each
  app's import map with `BRAND` unset and fails on any diff (TASKS.md 0.3.g).
- **Apps declare `supports`**; config validation rejects a module the chosen app
  cannot render, at build time rather than as a blank section in production.
- **Route parity**: every handler `@engine/http` exports is mounted by every app,
  checked in CI — an app that forgets the payment webhook route fails the build,
  not the first real payment.

## 7. Adding a brand

```bash
pnpm brand:create <slug> --name "<Name>" --storefront gallery|emporium
```

creates the database, runs every migration, seeds the vocabulary (gazetteer,
facets), scaffolds `<slug>/site/brand.config.json` from the app's defaults, and
prints the `.gaiadeploy.yml` target to add. Then, none of it code: brand tokens
and assets, module choices, provider secrets in Infisical, DNS.
