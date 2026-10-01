# J-S1 — The Instagram in-app browser → configurator → QRIS

> **Updated 2026-10-01 — S7, S10, S12, S13.** Everything is in stock, so no "made to
> order" promise (S7); a gift note only, no gift wrap (S10); free shipping over
> Rp 500.000 and a welcome code (S13); no refunds, a damaged print replaced on a photo
> (S12).

**Who:** a young professional in Denpasar who follows the shop on Instagram. She taps a
post of a framed map, lands on the product inside Instagram's own browser, configures a
framed giclée for her living room, and pays by QRIS — all on her phone, without leaving
Instagram if she can.

**Rests on:** D31 (guests only), D26 (240 ppi: the largest size is the design's print
ceiling — from its crop, or the object's box for a whole sheet, never the file's long
edge; C9 v1.4 `printCeilingOf()`, CONTENT-MODEL.md §2),
EXPERIENCE-SHOP.md §4 (the product page), §5 (the configurator: a GET form that works
without JavaScript; the preview on intent; impossible combinations disabled with the
reason), §7 (the bag drawer; checkout for an Indonesian destination; payment pending;
the in-app browser note), §8 (`/ig`; Permendag 31/2023: checkout on the site),
COMPLIANCE.md §1 (QRIS ≤ IDR 10 m), PAYMENTS.md §6 (OEI: Midtrans), DESIGN-SYSTEM.md §2
(`Order` payment-pending), S3 and D47 (delivery within Indonesia only at launch), S6 (a
separate WhatsApp number for online shoppers), S7, S10, S12, S13, Requirement 7.1–7.3,
7.9, 7.11.

**Used by:** 13.2 (steps marked **P**: the configurator), 32.1.a e2e (inside the Instagram,
WhatsApp and TikTok in-app browsers), 32.2 usability (at least three sessions start in
Instagram), phase 32 **Done when** (the largest giclée the seed scan allows — its ceiling
from the design's crop at 240 ppi, D26, C9 `printCeilingOf()` — "from stocked variants
with a teak frame and mount, sees it to scale, adds a gift note and a voucher (the
free-shipping bar at Rp 500.000, S13), pays by QRIS … in IDR only, and tracks the order
as a guest": a gift note, not gift wrap, S10).

## Before the session

- On staging: a product made from a seed design whose print ceiling is ≈ 37 cm — its
  crop's long edge in the master's pixels at 240 ppi (C9 `printCeilingOf()`; for a
  whole-sheet design, the object's box), not the scan file's long edge, which also holds
  the background, the card and the ruler; product-type tables with **test** prices (S2 —
  the price list is still owed); the variants offered **in stock** (S7); the free-shipping
  rule at Rp 500.000 and a welcome code with a **test** value (S13 — its real value is
  still owed); no gift wrap (S10).
- An Instagram post (a test account) or, failing that, a link opened from an Instagram
  direct message, so the page opens **in Instagram's in-app browser**.
- The Midtrans sandbox with QRIS and e-wallets; the mail catcher open.

## Say to the participant

> "You saw this map on the shop's Instagram and you'd like it framed for your living
> room. Make it the way you want it, and buy it."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Ig` (`ig`) or a product tag → `Item` (`item`) | land on the product: images (framed on a wall first), title, **Reproduction** label, **Archive No.**, "From Rp …" | the page is inside Instagram's webview; the primary image is the LCP; the price reads "From" until options are chosen |
| 2 **P** | `Item` › configurator | choose Format (Giclée), Size (the largest offered), Paper, Frame (natural teak), Mount (6 cm), Glazing | sizes above the design's print ceiling (its crop at 240 ppi, C9 `printCeilingOf()`) are absent; glass glazing disabled **with the reason** ("glass only for pickup or delivery within Bali") when ship-to is outside Bali; mount only with a frame; JavaScript off → radio groups in a GET form, the page reloads with the choice |
| 3 **P** | `Item` › preview | switch Flat · On a wall (three wall colours) · **To scale** (a 1.7 m person, a 2 m sofa) | the preview loads on intent and updates in under 100 ms on the reference device; the text summary is the truth, the preview decoration; the price change is announced politely |
| 4 **P** | `Item` › price and delivery promise | read the live price, the promise — **in stock** (S7), with the courier's estimate for her district — and the trust row: **a damaged print is replaced on a photo** (S12) | no "made to order" wording anywhere (S7); the promise reads the holiday calendar (Nyepi, Lebaran); no day count is shown until the courier data has one; "No COD — pay by QRIS or VA, confirmed instantly"; no refund or change-of-mind return is promised (S12 — counsel words the policy, D11) |
| 5 | `Item` › sticky buy bar | add to bag; optionally "Ask on WhatsApp" with the product and chosen options prefilled | the configuration lives in the URL, so a WhatsApp link restores it exactly; the link opens the **online shoppers' number**, not the showroom's (S6) |
| 6 | `Cart` drawer (`cart`) | see the line with its configuration, the **free-shipping bar toward Rp 500.000** (S13), the voucher field; enter the **welcome code** | no gift wrap offered (S10); a code expired / below its minimum spend / not combinable → a sentence that instructs; the bag re-prices on the server — `PriceChanged` shown if it moved |
| 7 | `Checkout` (Contact, Delivery, Shipping method, Payment) | give **WhatsApp number first** (`08…` → `+62 8…`), **one Full name**, address by province → city → district → sub-district pickers, a courier with price and ETA | guest only (D31): no account prompt anywhere; map pin optional; IDR only; delivery within Indonesia only (S3) |
| 8 | Payment → **QRIS** | choose QRIS | QRIS absent above IDR 10 m; methods filtered by amount |
| 9 | `Order` (`order/[number]`) › payment pending | see the exact amount, the QR, **"Save QR to gallery"** and e-wallet deep links (a phone cannot scan its own screen), the countdown | inside Instagram a step that cannot complete says so and offers **"Open in your browser"**, keeping the order; QR expired → another method, the bag kept |
| 10 | e-wallet app (sandbox) → back | pay; the page turns **Paid** by itself | never "upload your transfer receipt"; the confirmation email arrives; order updates by email (D14 default) |

## Channel handoffs

Instagram (a post or a tag) → the site inside **Instagram's in-app browser** → optionally
**WhatsApp** (the configuration in the URL) → an **e-wallet or bank app** (QRIS / deep
link) → back to the payment-pending page → **email** confirmation (WhatsApp updates once
D14 is answered) → the courier's tracking.

## The moment that decides trust

**Steps 9–10 — paying inside Instagram.** This is where in-app shoppers abandon: a QR
they cannot scan with the phone showing it, a gateway page that breaks in the webview,
or a "send us your receipt" instruction. The payment-pending page must give her the
exact amount, a way to pay from the same phone (save the QR, or jump to her e-wallet),
and then change to *Paid* on its own. Before that, step 2's disabled-with-a-reason
options tell her the shop knows its craft rather than letting her order the impossible.

## Success criteria

- Unaided: she configures the largest size, a teak frame and a mount, and views it to
  scale (steps 2–3). No size offered exceeds the design's print ceiling from its crop
  (≈ 37 cm on the seed design) — never a ceiling computed from the scan file's long
  edge.
- Unaided: she pays by QRIS from the same phone (steps 8–10) without leaving for a
  desktop.
- The price she saw in the configurator equals the bag's re-priced total, or the
  difference is shown (`PriceChanged`).
- No account is asked for at any step.
- Target: product page to *Paid* **under 3 minutes** (the shop's success measure,
  emporium PRODUCT.md), to calibrate in 13.2 and 32.2.

**Observe:** whether "giclée" needs explaining; whether she trusts the preview's size;
whether the free-shipping bar changes what she adds; what she does when the in-app
browser limits her.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S7 (everything in stock), S10 (a gift
note only), S12 (no refunds; a damaged print replaced on a photo), S13 (free shipping over
Rp 500.000 and a welcome code), S6 (a separate online WhatsApp number), S3 (Indonesia
only) — folded in above. **Still owed by the owner:** the catalogue — the formats, sizes,
papers and frames offered (S1); the price list (S2); the welcome code's value (S13); the
online WhatsApp number and its reply hours (S6). **Settled by the replan (TASKS.md
6.4):** the configurator offers only the variants in the shop's one stock pool, framed
prints included — a combination nobody stocks is never offered (S7, D52;
EXPERIENCE-SHOP.md §5). **Still open elsewhere:** counsel's wording of "no refunds"
against Indonesian consumer law (D11).
