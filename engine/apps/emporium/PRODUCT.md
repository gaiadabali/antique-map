# Product — Old East Indies (the `emporium` storefront)

<!-- impeccable:product-schema 1 -->

Drafted from research on 2026-09-25 (docs/RESEARCH.md §3); conformed to impeccable's
product schema on 2026-10-01 (TASKS.md 6.1.a). This app is named for its archetype —
a shop of variant merchandise — and serves Old East Indies through configuration. A
statement marked **(open — pending the owner interview, OA2 · Sn)** is the working
assumption until the owner answers question Sn in
`docs/design/journeys/owner-interview.md`; the answer folds in there. The journeys
this brief serves are `docs/design/journeys/shop/`.

## Platform

web

## Users

**Tourists** in Bali and Jakarta looking for something packable with meaning;
**expats** furnishing homes; the **Indonesian diaspora** and the **Dutch-Indisch
community**; **gift buyers** for oleh-oleh, housewarmings, Lebaran, Imlek,
Christmas and Sinterklaas (EXPERIENCE-SHOP.md §1). **Shoppers buy as guests** — no
shopper account (D31). **Business buyers** — the 100+ shops the brand already
supplies with art souvenirs (the client's form, `project-notes.md`), and hotels,
villas, cafés and companies buying art and gifts in quantity — all come through the
one **Partnership** programme and are the only accounts on the site (D31, D36). The
brand has ~11K Instagram followers (BRANDS.md); that most visitors arrive from
Instagram on a phone, and that many ask on WhatsApp before they buy, is the
research's expectation — **(open — pending the owner interview, OA2 · S9)**.

## Product Purpose

The first online store for a heritage merchandise brand that today trades from a
showroom at Jl. Gambuh 17, Denpasar, a WhatsApp Business catalogue and Drive PDFs,
with `oldeastindies.com` redirecting to a Linktree (RESEARCH.md §3.1). It sells
reproductions and products made from the Indies Gallery archive — the showroom shows
reproductions, notebooks, coasters, cards, totes and the Bali Hotel posters (NOW!
Bali, Jan 2026; the Hofker rights are D6, open). The launch range, sizes, papers and
frames — the client's Katalog Bali 2026 PDF could not be opened — are **(open —
pending the owner interview, OA2 · S1)**. The client asked for a site where people
browse products, read articles and **see how the souvenirs are made from the antique
originals** (`project-notes.md`); where the making happens and whether it may be filmed
is **(open — pending the owner interview, OA2 · S14)**. Success is an Instagram visitor configuring a
framed print and paying by QRIS in under three minutes, a tourist having it
delivered home, and a hotel ordering a wall through the Partnership.

## Positioning

Indonesian archive imagery **with provenance**, at lifestyle prices: every
product carries its Archive No., its story and a link to the original — which
print-on-demand marketplaces reselling public-domain images cannot offer
(RESEARCH.md §3.9). Warmer and more playful than the gallery; the same family. The
shop describes itself as "Bali, Singapore & Jakarta" (COMPLIANCE.md §2); where it
actually sells from and delivers to is **(open — pending the owner interview,
OA2 · S3, S4)**.

## Operating Context

Buyers browse by collection, place, era, mood, room and occasion; choose a format
from postcard to edition; configure size, paper, frame and mount; add gift wrap;
and pay with QRIS, an e-wallet or a virtual account in Indonesia, or a card or
PayPal abroad (PAYMENTS.md §6). The showroom is a stock location and a pickup point;
its hours, what it stocks and how it takes payment are **(open — pending the owner
interview, OA2 · S4)**. Products are created in bursts from archive works in the
admin. Saved items live on the shopper's device (D35); a saved search is an email
alert with double opt-in, no account (D39). How orders arrive today — Instagram,
WhatsApp, the showroom, the partner shops — is **(open — pending the owner
interview, OA2 · S9)**.

## Capabilities and Constraints

- Variants generated from product types; stocked, or made to order in Bali. **Print-
  on-demand abroad is not part of the launch** (D23's default; COMMERCE.md §8): export
  orders ship from Bali stock or local production, duties the recipient's (DAP).
  Never overseas production for Indonesian orders (import duty). Who makes each
  product — the owner's design draft says an own workshop in Bali — which lines are
  stocked and which made to order, and how long making takes are **(open — pending
  the owner interview, OA2 · S1, S7)**.
- The configurator's sizes are capped by each scan's resolution (240 ppi, D26).
- **Indonesian delivery is priced in IDR only** (the rupiah rule). Export
  destinations see their market's currency; the Indonesian seller charges IDR by card
  or USD through PayPal (D2's default, PAYMENTS.md §6), so an export price says which
  currency is charged. Retail prices are **(open — pending the owner interview,
  OA2 · S2)**.
- Payment methods filtered by amount (QRIS ≤ IDR 10 m, COMPLIANCE.md §1).
- Social media may promote but not take payment — checkout is always on the site
  (Permendag 31/2023).
- **Partners** apply, are approved by staff, and order by quote at a trade tier with a
  minimum order, paid by bank transfer or pay link (D32's default); an ended
  partnership deactivates the account (D34). What partners get today is **(open —
  pending the owner interview, OA2 · S5)**.
- **Selling entity (D2, adviser):** an Indonesian PT at launch; a Singapore seller for
  export is a v2 option.

## Brand Commitments

- Every product says **Reproduction** and shows its Archive No. (Requirement 7.1).
- Celebrate cartography and the archipelago — **not the VOC**; no VOC logo, no
  colonial nostalgia as a voice (EXPERIENCE-SHOP.md). The owner's own words on the
  brand's stance and register are **(open — pending the owner interview, OA2 · S15)**.
- Warm, sunlit, giftable; WhatsApp is always one tap away.
- **One shared base with the gallery, the shop's own accents** (D9's shape): layout,
  components, buttons and type — Cormorant Garamond + Karla, which the client asked to
  keep — are shared; the shop differs in palette and signature details, starting from
  its logo's brown `#593D21` and cream `#F1E5D3` (TASKS.md 12.2.a). A cultural review by
  Indonesian designers and buyers judges those accents (12.2, OA5). The Archive No. tag
  is a shared sister element (EXPERIENCE-SHOP.md; TASKS.md 12.3.a).
- The hero line must not depend on one artist while Hofker's rights are unconfirmed
  (D6); which artwork leads is **(open — pending the owner interview, OA2 · S8)**.

## Evidence on Hand

- The showroom (NOW! Bali, Jan 2026), the Linktree and WhatsApp catalogue, the
  owner's history columns, the gallery's "Buy Reproduction" links
  (MIGRATION.md §10); benchmark findings (RESEARCH.md §3); the client's form
  (`project-notes.md`).
- The owner's design draft (`Home - Old East Indies.dc.html`) — draft input: its copy
  ("420 prints", "from Rp 185.000", "300gsm cotton", "Free shipping in Indonesia over
  Rp 500.000", "Printed in our own workshop… not print-on-demand", "We correct foxing,
  tears and fading") is not confirmed fact.
- **Absences that must not be invented:** the product list and prices, the Hofker
  licence, showroom photography and opening hours, paper and frame suppliers, lead
  times, gift-wrap and free-shipping terms, the returns policy (D11), the legal entity
  and tax status (D2, D4). The shop's intentions on gifts, damage and offers are
  **(open — pending the owner interview, OA2 · S10, S12, S13)**; the WhatsApp number
  and its reply hours **(open — pending the owner interview, OA2 · S6)**; delivery to
  villas before departure **(open — pending the owner interview, OA2 · S11)**.

## Product Principles

1. **Story first, then product.** Every item is a way into the archive.
2. **From postcard to edition.** One artwork spans the whole price ladder.
3. **Phone and WhatsApp native.** The flow is designed at 390 px first.
4. **Honest labels.** Reproduction, made to order, the real making and delivery time —
   true, always, and shown only when the data says so (COMMERCE.md §1).
5. **The showroom and the site are one shop.**

## Accessibility & Inclusion

WCAG 2.2 AA. The configurator is a set of real radio groups with a text summary;
the preview is decoration; price changes are announced politely; English and
Indonesian (Dutch later); `prefers-reduced-motion` honoured absolutely.
