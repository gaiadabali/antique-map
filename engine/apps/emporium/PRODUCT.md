# Product — Old East Indies (the `emporium` storefront)

<!-- impeccable:product-schema 1 -->

Drafted from research on 2026-09-25 (docs/RESEARCH.md §3); conformed to impeccable's
product schema on 2026-10-01 (TASKS.md 6.1.a); the owner's interview answers folded in
on 2026-10-01 (TASKS.md 6.1.f, `docs/design/journeys/owner-answers.md`, cited below as
**S1–S15**). This app is named for its archetype — a shop of variant merchandise — and
serves Old East Indies through configuration. Every interview question for the shop is
answered; a few answers name something the owner still has to send. Each of those
stands where it applies, marked open with its question number and what is still owed,
and nothing is invented in its place. The architect's replan (TASKS.md 6.4: S3, S7,
D52, D55) is folded in (6.6). The journeys this brief serves are
`docs/design/journeys/shop/`.

## Platform

web

## Users

**Showroom walk-ins are the main buyers today** (S9): visitors to the showroom at
Jl. Gambuh 17, Denpasar. Who they are was not asked; online, the audiences are the
research's: **tourists** in Bali and Jakarta looking for something
packable with meaning; **expats** furnishing homes; the **Indonesian diaspora** and the
**Dutch-Indisch community**; **gift buyers** for oleh-oleh, housewarmings, Lebaran,
Imlek, Christmas and Sinterklaas (EXPERIENCE-SHOP.md §1) — **delivered within Indonesia
only at launch** (S3). **Shoppers buy as guests** — no shopper account (D31). **Business
buyers** — the 100+ shops the brand already supplies with art souvenirs (the client's
form, `project-notes.md`), and hotels, villas, cafés and companies buying art and gifts
in quantity — all come through the one **Partnership** programme and are the only
accounts on the site (D31, D36). The brand has ~11K Instagram followers (BRANDS.md); the
phone comes first online, and the showroom's QR labels bring walk-ins onto the site
(S4, S9).

## Product Purpose

The first online store for a heritage merchandise brand that today trades from a
showroom at Jl. Gambuh 17, Denpasar, a WhatsApp Business catalogue and Drive PDFs,
with `oldeastindies.com` redirecting to a Linktree (RESEARCH.md §3.1). It sells
reproductions and products made from the Indies Gallery archive — the showroom shows
reproductions, notebooks, coasters, cards, totes and the Bali Hotel posters (NOW!
Bali, Jan 2026; the Hofker rights are D6, open). The launch range, sizes, papers and
frames come from the client's "Katalog Bali 2026" —
**(open — pending the owner interview, OA2 · S1: the catalogue, resent; still owed)**;
until it arrives a placeholder range is designed and nothing is published. The client
asked for a site where people browse products, read articles and **see how the
souvenirs are made from the antique originals** (`project-notes.md`); the owner agreed to
have the making filmed and photographed on the photo day (S14; the `showroom_making`
shots, TASKS.md 6.2.h).
Success is a showroom visitor scanning a label and leaving with the piece, an Instagram
visitor configuring a framed print and paying by QRIS in under three minutes, a tourist
having it delivered to her villa before she flies, and a hotel ordering a wall through
the Partnership.

## Positioning

Indonesian archive imagery **with provenance**, at lifestyle prices: every
product carries its Archive No., its story and a link to the original — which
print-on-demand marketplaces reselling public-domain images cannot offer
(RESEARCH.md §3.9). Warmer and more playful than the gallery; the same family. The
shop described itself as "Bali, Singapore & Jakarta" (COMPLIANCE.md §2); at launch it
**sells and delivers within Indonesia only** (S3, D47), from its showroom in Denpasar
(S4).

## Operating Context

Buyers browse by collection, place, era, mood, room and occasion; choose a format
from postcard to edition; configure size, paper, frame and mount; and pay with QRIS, an
e-wallet or a virtual account (PAYMENTS.md §6). There is no checkout to an address
abroad at launch, so no foreign-currency estimate and no PayPal charge (S3, D47).
**The showroom is fully part of the shop** (S4): published opening hours —
**(open — pending the owner interview, OA2 · S4: the opening hours; still owed)** — QRIS at the
counter, pickup of online orders, and QR labels on the walls opening each product. In
Bali a courier delivers to a hotel or villa by a **"deliver before" date**, same-day
where the courier offers it (S11). Online shoppers message **their own WhatsApp number,
separate from the showroom's** —
**(open — pending the owner interview, OA2 · S6: the number and its reply hours; still owed)**.
Products are created in bursts from archive works in the admin. **The stock is one pool
at launch** (D52): every unit counts once per variant, held at the showroom, with no
split by shop or location, no transfers and no showroom-stock badge or filter — "in
stock" says it. The merchandise also sells through hundreds of partner shops across
Bali, which report sales and restocking over WhatsApp as today; staff correct the pool in
the admin, and selling from those shelves on this engine waits for the point-of-sale
phase (backlog v2.19). Saved items live on the shopper's device (D35); a saved search is
an email alert with double opt-in, no account (D39).

## Capabilities and Constraints

- **Everything is in stock** (S7): the shop makes no "made to order" promise, and a
  delivery promise is read from stock and the courier. The configurator offers only the
  variants in stock — framed options included (COMMERCE.md §4, EXPERIENCE-SHOP.md §5).
  Who makes each product, and in which workshop, waits on the catalogue (S1,
  above). **Print-on-demand abroad is not part of the launch** (D23), and neither is
  export (S3).
- The configurator's sizes are capped by each scan's resolution (240 ppi, D26).
- **Prices are in IDR only** (the rupiah rule; with no export at launch, there is no "≈"
  estimate beside them — D47). D47's rupiah-first mechanism for a buyer abroad
  (COMMERCE.md §3, PAYMENTS.md §6) stays the design for when export opens. Retail
  prices come from the owner's price list —
  **(open — pending the owner interview, OA2 · S2: the price list; still owed)**; staging
  carries test prices only.
- Payment methods filtered by amount (QRIS ≤ IDR 10 m, COMPLIANCE.md §1).
- **Analytics are first-party only**, shown in the admin dashboard (D55, the owner's
  G12): no GA4 and no Meta Pixel at launch, even after consent.
- Social media may promote but not take payment — checkout is always on the site
  (Permendag 31/2023).
- **Offers in the bag:** free shipping over **Rp 500.000** and a **welcome code**, set in
  the admin at launch (S13) — the code's value
  **(open — pending the owner interview, OA2 · S13: the welcome code's value; still owed)**.
  No other voucher is promised.
- **Gifts:** a **gift note only**, with prices hidden on the packing slip (S10); no gift
  wrap is offered.
- **No refunds and no change-of-mind returns; a print that arrives damaged is replaced
  on a photo** (S12) — the owner's intention, which counsel confirms against Indonesian
  consumer law before anything is published (D11).
- **Partners** apply, are approved by staff, and order by quote, paid by bank transfer or
  pay link; **their terms are case by case** (S5, D32): the Partnership page publishes no
  fixed discount or minimum, and each partner's tier and minimum are data staff set
  (D33, D37). An ended partnership deactivates the account (D34).
- **Selling entity (D2, adviser):** an Indonesian PT at launch; a Singapore seller for
  export is a v2 option.

## Brand Commitments

- Every product says **Reproduction** and shows its Archive No. (Requirement 7.1).
- Celebrate cartography and the archipelago — **not the VOC**: no VOC logo, no VOC
  imagery beyond the items themselves, no colonial nostalgia as a voice (S15, confirmed
  by the owner; EXPERIENCE-SHOP.md).
- The shop speaks Indonesian in the polite **Anda** register, not *kamu* (S15), and
  English in **British spelling** (owner's answer, 2026-10-01); warm, sunlit, giftable;
  WhatsApp is always one tap away.
- **One shared base with the gallery, the shop's own accents** (D9's shape): layout,
  components, buttons and type — Cormorant Garamond + Karla, which the client asked to
  keep — are shared; the shop differs in palette and signature details, starting from
  its logo's brown `#593D21` and cream `#F1E5D3` (TASKS.md 12.2.a). A cultural review by
  Indonesian designers and buyers judges those accents (12.2, OA5). The Archive No. tag
  is a shared sister element (EXPERIENCE-SHOP.md; TASKS.md 12.3.a).
- **A map of the archipelago leads the shop** (S8); the Hofker line waits for its
  licence (D6), and no hero depends on it.

## Evidence on Hand

- The showroom (NOW! Bali, Jan 2026), the Linktree and WhatsApp catalogue, the
  owner's history columns, the gallery's "Buy Reproduction" links
  (MIGRATION.md §10); benchmark findings (RESEARCH.md §3); the client's form
  (`project-notes.md`).
- The owner's interview answers of 1 October 2026 (`docs/design/journeys/owner-answers.md`).
- The owner's design draft (`Home - Old East Indies.dc.html`) — draft input. Of its copy,
  "Free shipping in Indonesia over Rp 500.000" is now confirmed (S13); "420 prints",
  "from Rp 185.000", "300gsm cotton", "Printed in our own workshop… not print-on-demand"
  and "We correct foxing, tears and fading" are not confirmed fact.
- **Absences that must not be invented:** the product list and prices (S1, S2 — owed),
  the showroom's opening hours (S4 — owed), the online WhatsApp number and its reply
  hours (S6 — owed), the welcome code's value (S13 — owed), the Hofker licence, paper and
  frame suppliers, the returns wording (D11), the legal entity and tax status (D2, D4).

## Product Principles

1. **Story first, then product.** Every item is a way into the archive.
2. **From postcard to edition.** One artwork spans the whole price ladder.
3. **Phone and WhatsApp native.** The flow is designed at 390 px first.
4. **Honest labels.** Reproduction, in stock, the real delivery time — true, always, and
   shown only when the data says so (COMMERCE.md §1).
5. **The showroom and the site are one shop.** Walk-ins are the main buyers (S9): a QR
   label, a counter that sees an online order as paid, a pickup that works.

## Accessibility & Inclusion

WCAG 2.2 AA. The configurator is a set of real radio groups with a text summary;
the preview is decoration; price changes are announced politely; English and
Indonesian (Dutch later); `prefers-reduced-motion` honoured absolutely.
