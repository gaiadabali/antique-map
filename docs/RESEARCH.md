# Research — the evidence behind the plan

Four research streams run on 2026-09-25, each against live sites, registries and
primary sources rather than memory: the gallery benchmark (with a full audit of
the live Indies Gallery store), the merchandise benchmark, the commerce platform
choice, and payments/logistics/compliance. This file keeps what the other docs
cite. Where a stream could not verify something it is marked **(nv)**.

---

## 1. Indies Gallery — benchmark and audit

**Sites read:** raremaps.com (PDP, category, FAQ, terms, Notable Sales,
Publications, About) · alteagallery.com · sanderusmaps.com · swaen.com ·
crouchrarebooks.com · 1stdibs.com · Artsy help · allmaps.org · davidrumsey.com ·
rijksmuseum.nl · Leiden Digital Collections · the whole of
antiquemapsindonesia.com (home, five PDPs, category pages in sold/sort/search
views, support pages, robots, sitemap). Not reached: antiques-orient.com and
aoto.com.sg (DNS); skipped after a rate limit: Christie's, Sotheby's, Heritage,
Pamono, LoC, Neatline, Curtis Wright, Martayan Lan, Arader, Potter, Forum.

### 1.1 The live site (antiquemapsindonesia.com)

The audit's full defect list is in MIGRATION.md §1 — observations about the old
site that shape the new one; this project does not touch the old site. The
headline: debug output on in production (a Laravel stack trace at
`/sitemap.xml`); no SEO scaffolding;
one untiled JPEG per item; broken sort; no facets; **no terms, returns, shipping
or payment information at all**; stale Issuu catalogues; taxonomy and data
defects; a "Buy Reproduction" link that dead-ends. And a real moat: 347 maps,
1,428 prints, 182 photographs of the region (raremaps' Indonesia category: 192;
1stDibs' "antique maps Indonesia" page: 152), the Parry certificate, the
institutional client list, and long essays nobody else has.

### 1.2 The fifteen patterns that matter most

| # | Pattern | Best at |
| - | ------- | ------- |
| 1 | tiled deep zoom with recto, verso and details | raremaps (OpenSeadragon + DZI); Sanderus lists verso images in JSON-LD |
| 2 | a published condition scale + narrative + defects | raremaps FAQ (VG+…Poor); Sanderus condition rating (A+…D); Swaen condition report |
| 3 | sold items stay live with an in-stock alternative and an alert | raremaps sold PDP |
| 4 | a structured collation block | Sanderus (title transcription, first edition / this map / on map, sizes in mm + in, verso, source with Koeman ref) |
| 5 | scholarly references | Sanderus (Koeman, Tibbetts, Tooley), raremaps (Schilder), Altea (Tooley) |
| 6 | guarantee and COA on the PDP | Sanderus authenticity popup; Swaen lifetime guarantee + COA PDF; raremaps COA by default |
| 7 | buy and enquire side by side | Crouch; Altea (+ "Export as PDF") |
| 8 | multi-currency transparency | Sanderus inline "€12000 ($13680 / £10200)"; Altea switcher; 1stDibs per-currency Offers |
| 9 | facets collectors use | raremaps (for sale/sold, updated 30–120 days, maker, publication year, price, size in inches) |
| 10 | hook headline over the original title | Altea; Sanderus card taglines |
| 11 | collector tools | raremaps "register it in your collection", "not interested", guest notify-me; Swaen virtual collection |
| 12 | payment-verified offers | Artsy Make Offer (binding, 72 h counters) |
| 13 | shipping quote, protection and response time on the PDP | 1stDibs |
| 14 | an institutional proof page | raremaps Notable Sales |
| 15 | factsheet, print and scale tools | Crouch factsheet + "To scale"; raremaps print; Altea PDF |

### 1.3 Grading scales in use

raremaps VG+ / VG / Good / Fair / Poor ("true 'Fine' is almost never possible") ·
Sanderus A+ / A / B / C / D · Swaen Mint (≈3%) / Very fine / Fine / Good / Fair /
Poor / As is, plus HiBCoR 1–10 · Indies today G / G+ / VG / VG+, unpublished.
**Recommendation adopted:** publish VG+ / VG / G+ / G / Fair / As-is with
definitions and A–D equivalents, so existing data carries over.

### 1.4 SEO observed

raremaps: `VisualArtwork` without Offer, `product:availability` on sold pages,
Organization, Store, BreadcrumbList. Sanderus: `Product` + `Offer`,
`UsedCondition`, verso in the image array, `memberOf`. 1stDibs: `Product` with ten
per-currency Offers. Adopted: `["Product","VisualArtwork"]` (EXPERIENCE-GALLERY.md
§11). raremaps ranks on depth (17,861 live, 80,000+ sold), unique essays, maker
pages, canonicals, breadcrumbs and structured data, and decades of scholarly links.

### 1.5 Visual analysis

Crouch is the premium benchmark (a Baroque-revival serif with Akkurat, parchment
hairlines, small caps, one or two actions); raremaps is the functional best but
busy (up to six actions per card); Altea is tidy but templated; Sanderus and
Swaen look dated; Indies today is the most dated. Premium cues: warm neutral mats
(pure white makes toned paper look dirty), a clear display/text/data type
hierarchy, one or two actions, consistent data grids, quiet motion. Three
directions proposed — **Print Room** (recommended), Spice Route, Chart Table —
with fonts and palettes in EXPERIENCE-GALLERY.md.

### 1.6–1.9 Flows, trust, content

Purchase tiers, offers, holds, installments, institutions, returns and shipping
benchmarks are in §2. Trust: memberships (ABAA, ILAB, IMCoS — IMCoS realistic
now; ILAB/VEBUKU need a national association seat), Parry as the moat,
authentication explained, institutions, testimonials, appointments. Content:
Crouch's "Discover" hub as the editorial model; web-native catalogues; automated
new-arrivals letters (raremaps: 40,000+ recipients); saved searches; want-lists;
fair calendars; WhatsApp prefilled with the SKU as the service channel.

### 1.10 Gaps no dealer owns

Georeferenced then/now for Indonesia (Allmaps: "georeference any map from any
institution that supports IIIF"; Rumsey's georeferencer) · an Archipelago
Explorer with a time slider · voyage story maps · **the Parry cartobibliography
online** · photo scholarship cross-linked to Leiden (KITLV) and Rijksmuseum IIIF ·
diaspora search in Bahasa and Dutch · hospitality curation for Bali villas ·
the original ↔ print bridge with Old East Indies · SEA-native commerce (IDR/SGD,
QRIS, WhatsApp, viewings in three cities) · condition imaging beyond the norm.

**Sources:** raremaps.com/gallery/detail/93147/… · raremaps.com/category/maps/asia/southeast-asia/indonesia ·
raremaps.com/site/faq · raremaps.com/site/terms · raremaps.com/notable-sales · raremaps.com/publications ·
alteagallery.com/product/hondius-east-indies-2-25081 · alteagallery.com/terms-and-conditions ·
alteagallery.com/antique-map-framing · sanderusmaps.com/condition-rating ·
sanderusmaps.com/our-catalogue/antique-maps/asia/southeast-asia/… · swaen.com/hibcor ·
swaen.com/faq/guarantee-certificate-of-authenticity · swaen.com/faq/item-description/condition-report ·
swaen.com/faq/invoice-payments-shipping/holdparcel · crouchrarebooks.com ·
1stdibs.com/buy/antique-maps-indonesia · support.artsy.net (Buy Now / Make Offer FAQ) ·
oldworldauctions.com/resources/terms-and-conditions · allmaps.org · davidrumsey.com ·
rijksmuseum.nl/en/collection · digitalcollections.universiteitleiden.nl · antiquemapsindonesia.com (pages listed in MIGRATION.md).

## 2. Buying unique paper — the flows benchmarked

- **Tiers:** up to ~$5k buy + enquire; $5–25k buy + reserve + offer; above $25k
  or institutions: price on request, viewing, proforma. "Request price" should
  answer instantly and log the lead.
- **Soft holds:** lock a qty-1 item ~15 min once checkout starts, with a
  countdown; show "On hold" publicly (schema `Reserved`); "subject to prior sale";
  Altea: "orders are dealt with in strict order of receipt". Swaen's hold option
  combines purchases into one shipment.
- **Offers:** Artsy's model — binding, payment on file, a private floor, 72-hour
  counters.
- **Institutions:** proforma, PO field, bank transfer; wire details on invoices,
  never on a public page; "payment must be received and confirmed before an
  order is considered complete" (raremaps).
- **Returns and guarantee:** raremaps full refund within two weeks less shipping
  and insurance; Altea 14 days and "we do not sell reproductions"; Swaen lifetime
  guarantee. Adopted default: 14-day returns + lifetime authenticity guarantee +
  the Parry certificate (subject to counsel, COMPLIANCE.md §6).
- **Shipping:** raremaps signature from $500, same-day before 2 pm; Swaen flat $25
  / $40; Altea free over £500; add white-glove delivery and hanging in Jakarta,
  Bali and Singapore.

## 3. Old East Indies — benchmark

### 3.1 Where it stands

Showroom at Jl. Gambuh 17, Denpasar (Jan 2026) showing originals beside
reproductions, notebooks, coasters, cards, totes and the Hofker Bali Hotel
posters (NOW! Bali). Online: a Linktree to a WhatsApp Business catalogue, Drive
PDFs, Instagram/Facebook and the owner's history columns in NOW! Bali.
`oldeastindies.com` 301s to the Linktree, including indexed Squarespace product
paths; the gallery's "Buy Reproduction" dead-ends there.

### 3.2 The fifteen patterns

Story and provenance on every PDP (V&A Strawberry Thief; TNA prints the catalogue
ref) · a price ladder of formats on one artwork (Rijksmuseum €9.95 poster → €199.95
giclée; TNA £3.25 → £55) · a configurator with live price (Met custom prints —
never larger than the original; V&A custom prints) · gift navigation (V&A, Met,
Rifle) · WhatsApp-native commerce (Cotton Ink, Erigo, Magali Pascal ID) · scale
and on-the-wall preview (Saatchi web AR: 4× conversion, +17% spend; Framebridge
hanging guides) · one image, many products (Rifle, Society6, Cavallini) · print
any item from the archive (Met, TNA via King & McGaw, LoC) · browse by mood, room
and colour (Object & Archive, V&A, King & McGaw) · showroom-aware online shop
(British Museum click & collect, Erigo store locator) · spend thresholds and
vouchers (Cotton Ink, Erigo) · gallery-wall sets and builder (Desenio) ·
personalised place maps (Mapiful, Unique Maps Co) · a trade programme (Met trade,
Photowall, Cavallini wholesale) · welcome offer, loyalty, member discounts (V&A,
Cotton Ink, Magali Pascal).

### 3.3–3.8 Configurator, checkout, fulfilment, directions, cross-brand, scope

Captured in full in EXPERIENCE-SHOP.md (§4–§11) and COMMERCE.md (§3, §8).
Fulfilment vendors assessed: **Prodigi** (fine art; UK/NL/US plants, partners
incl. Australia; Fine Art Trade Guild giclée; no confirmed SEA production) ·
**Gelato** (posters, cards, mugs, tees; local production in 32 countries incl.
Singapore; partners unnamed — order samples) · Printful (apparel) · Printify
(uneven QC) · Gooten (skip) · local Bali printers (MahaMeru; tees.co.id — manual
ordering). Recommended: a mix — stock in Bali for the top lines, made-to-order
giclée and teak frames in Bali, print-on-demand abroad for export orders.
Marketplaces later through an omnichannel hub (Jubelio or Ginee) rather than
direct Shopee/TikTok-Tokopedia APIs, which sellers report as turbulent since the
merger.

### 3.9 Gaps nobody owns

Indonesian archive imagery with provenance at lifestyle prices (print-on-demand
marketplaces resell museum images with no context) · personalised old maps of
Indonesian towns · buy in Bali, delivered home duties paid · hotels and heritage
(the Bali Hotel of the posters still operates as Inna Bali) · packable souvenirs ·
the Indisch community in the Netherlands.

**Sources:** vam.ac.uk/shop · shop.nationalarchives.gov.uk · rijksmuseumshop.nl/en/prints ·
customprints.metmuseum.org · store.metmuseum.org · riflepaperco.com · cottonink.co.id · erigostore.co.id ·
id.magalipascal.com · rockpaperreality.com/our-work/saatchi-art · framebridge.com · society6.com · cavallini.com ·
library-of-congress-shop.myshopify.com/pages/print-on-demand · objectandarchive.com · kingandmcgaw.com ·
britishmuseumshoponline.org · desenio.com · mapiful.com · uniquemaps.com · photowall.com · sejauh.com ·
prodigi.com (fine-art-printing, global-print-network, products/au) · gelato.com · help.printful.com · printify.com ·
mahameru.id · tees.co.id · jubelio.com · restofworld.org/2025/tiktok-indonesia-tokopedia-merger-problems ·
nowbali.co.id (showroom article; author/sake-santema) · linktr.ee/oldeastindiesbali.

## 4. The commerce platform

Checked against live npm registries and by reading the published
`@payloadcms/plugin-ecommerce@3.90.2` source.

| Criterion (×2 = weighted double) | Payload-native | Medusa + Payload | Vendure | Saleor | Shopify headless |
| -------------------------------- | :-: | :-: | :-: | :-: | :-: |
| One-of-one reservation + holds ×2 | 3 | 3 | 3 | 4 | 3 |
| Offer / inquiry / POR / invoice ×2 | 5 | 3 | 3 | 3 | 3 |
| Variants at scale | 3 | 5 | 5 | 5 | 4 |
| Fixed per-currency prices | 4 | 5 | 4 | 5 | 4 |
| Tax (PPN / GST) | 2 | 4 | 4 | 4 | 4 |
| Shipping (Biteship / DHL) | 2 | 3 | 3 | 3 | 3 |
| Xendit / Midtrans / Stripe / PayPal | 4 | 4 | 3 | 2 | 2 |
| Print-on-demand | 2 | 3 | 3 | 3 | 5 |
| Promotions, gift cards, B2B | 1 | 5 | 4 | 5 | 5 |
| CMS + editorial + i18n + SEO in one ×2 | 5 | 3 | 3 | 3 | 3 |
| Legacy migration ×2 | 5 | 3 | 3 | 3 | 4 |
| Ops simplicity ×2 | 5 | 2 | 3 | 1 | 5 |
| Team + AI-agent fit ×2 | 5 | 3 | 3 | 1 | 3 |
| Cost / licence | 5 | 5 | 3 | 4 | 2 |
| Maturity | 2 | 4 | 4 | 4 | 5 |
| **Weighted total** | **81** | 72 | 69 | 65 | 76 |

Key facts: the plugin is **beta**; it charges `cart.subtotal` only; it has no
reservation and an unguarded stock decrement (a unique item can sell twice); its
variant validation branch never runs; it uses APIs removed in v4. Payload's
multi-tenant plugin is one database with a tenant column. Medusa 2.21.1: mature
merchandising, but reservations at order placement with no expiry, an oversell
fix unmerged (PR #16575), and Postgres + Redis + server + worker per brand. No
Xendit/Midtrans/DOKU providers exist for Medusa or Payload. Shopify Payments is
not available in Indonesia (available in Singapore); third-party gateways cost a
0.6–2% platform fee; customer passwords cannot be imported. Vendure is GPLv3 or
~€2,100/month commercial. Payload 3.90.2 is current; Payload 4 is canary; Next is
16.3.6; Payload has initial Next 16 Cache Components support.

**Sources:** payloadcms.com/docs/ecommerce (overview, plugin, payments) ·
github.com/payloadcms/payload (templates/ecommerce, packages/plugin-ecommerce) ·
payloadcms.com/docs/plugins/multi-tenant · docs.medusajs.com (Payload guide, inventory concepts, deployment) ·
github.com/medusajs/medusa/pull/16575 · vendure.io/licensing · github.com/saleor/saleor/releases ·
help.shopify.com (supported countries; third-party transaction fees).

## 5. Payments, logistics, customs, compliance

The findings and their consequences are COMPLIANCE.md and PAYMENTS.md. The
numbered sources behind them:

1. stripe.com/global · 2. stripe.com/en-sg/pricing · 3. docs.stripe.com/payments/payment-methods/payment-method-support ·
4. docs.stripe.com/payouts/multicurrency-settlement · 5. docs.xendit.co/docs/card-multi-currency-processing ·
6. help.xendit.co — "Can Xendit help me accept payments in USD or other currencies" ·
7. docs.xendit.co/docs/{qris, bca-virtual-account, mandiri-virtual-account, bni-virtual-account, bri-virtual-account, permata-virtual-account, ovo, dana, alfamart, indomaret, kredivo} ·
8. help.xendit.co — Xendit Pricing Policy; docs.xendit.co/docs/transaction-fees · 9. software-listing.com/q/payment-gateway-indonesia ·
10. github.com/xendit/xendit-node · 11. xendit.co/en/products/cross-border-payments; card eligibility help article ·
12. midtrans.com/pricing · 13. docs.midtrans.com — minimum and maximum transaction amounts ·
14. docs.midtrans.com — receiving payments in other currencies · 15. doku.com/en-us/pricing; docs.doku.com/accept-payments/payment-methods ·
16. paypal.com/id/webapps/mpp/merchant-fees · 17. paypal.com/sg/business/paypal-business-fees ·
18. airwallex.com newsroom (Indonesia acquisition) · 19. wise.com/id/legal/terms-of-use · 20. ezeelink.co.id/blog/limit-qris ·
21. pasal.id — UU 7/2011 art. 21, 33 · 22. bicara131.bi.go.id — KA-01014 · 23. kcaselawyer.com — dual quotation ban ·
24. peraturan.bpk.go.id — UU 11/2010; pasal.id art. 109 · 25. peraturan.bpk.go.id — Permendag 22/2023 (appendix V) ·
26. peraturan.bpk.go.id — Permendag 6/2026; sakalawfirm.com summary · 27. bpkw19.id ·
28. pajak.go.id/en/node/113453; news.ddtc.co.id (PPN 2026) · 29. jdih.kemenkeu.go.id — PMK 96/2023 and amendments ·
30. kemendag.go.id / liputan6.com — Permendag 31/2023 · 31. kres.id; kompas.id — PP 33/2026 ·
32. belastingdienst.nl — 9% VAT on art, collectors' items and antiques · 33. trade.ec.europa.eu; eur-lex — Regulation 2019/880 ·
34. consilium.europa.eu — €3 duty on small parcels from 1 Jul 2026 · 35. congress.gov CRS LSB11398; cov.com; federalregister.gov 2026-12670 ·
36. iras.gov.sg — GST registration, exemption, overseas businesses · 37. customs.gov.sg — controlled goods; permit exemptions ·
38. fedex.com — declared value · 39. dhl.com — restricted commodities; shipment value protection (Indonesia) ·
40. biteship.com/en/product/api · 41. bantuan.komerce.id; komerce.id — RajaOngkir V2 ·
42. peraturan.bpk.go.id — Permenkominfo 5/2020 · 43. jdih.kemendag.go.id — PP 80/2019 · 44. jdih.esdm.go.id — UU 8/1999.

**Confidence notes:** Xendit's per-channel Indonesian fees sit behind Cloudflare
and need a quote; DOKU non-IDR settlement needs confirmation; Airwallex's
Indonesian product is unconfirmed; 2C2P, Adyen, UPS, Shipper, Everpro and the
marketplace APIs were not re-verified.
