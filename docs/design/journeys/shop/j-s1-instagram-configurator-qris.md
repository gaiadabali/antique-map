# J-S1 — The Instagram in-app browser → configurator → QRIS

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
(`Order` payment-pending), Requirement 7.1–7.3, 7.9, 7.11.

**Used by:** 13.2 (steps marked **P**: the configurator), 32.1.a e2e (inside the Instagram,
WhatsApp and TikTok in-app browsers), 32.2 usability (at least three sessions start in
Instagram), phase 32 **Done when** (the largest giclée the seed scan allows — its ceiling
from the design's crop at 240 ppi, D26, C9 `printCeilingOf()` — teak frame and mount, to
scale, gift wrap and a voucher, QRIS in IDR, tracked as a guest).

## Before the session

- On staging: a product made from a seed design whose print ceiling is ≈ 37 cm — its
  crop's long edge in the master's pixels at 240 ppi (C9 `printCeilingOf()`; for a
  whole-sheet design, the object's box), not the scan file's long edge, which also holds
  the background, the card and the ruler; product-type tables with **test** prices (S2);
  a voucher code;
  gift wrap switched on only if S10 confirms it (else skip that step and note it).
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
| 4 **P** | `Item` › price and delivery promise | read the live price and the promise ("Made to order, ships in N days" — S7) and the shipping estimate for her district | the promise reads the holiday calendar (Nyepi, Lebaran); no day count is shown until the data has one (S7 default); "No COD — pay by QRIS or VA, confirmed instantly" |
| 5 | `Item` › sticky buy bar | add to bag; optionally "Ask on WhatsApp" with the product and chosen options prefilled | the configuration lives in the URL, so a WhatsApp link restores it exactly |
| 6 | `Cart` drawer (`cart`) | see the line with its configuration, the free-shipping bar (only if S13 sets a threshold), a voucher field; add gift wrap | voucher expired / below minimum spend / not combinable → a sentence that instructs; the bag re-prices on the server — `PriceChanged` shown if it moved |
| 7 | `Checkout` (Contact, Delivery, Shipping method, Payment) | give **WhatsApp number first** (`08…` → `+62 8…`), **one Full name**, address by province → city → district → sub-district pickers, a courier with price and ETA | guest only (D31): no account prompt anywhere; map pin optional; IDR only |
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
what she does when the in-app browser limits her.

## Open until the owner answers

S1 (the options and papers offered), S2 (prices), S7 (lead time), S10 (gift wrap), S12
(the damaged-print promise in the trust row), S13 (free-shipping threshold, vouchers).
