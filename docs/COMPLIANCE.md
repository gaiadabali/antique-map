# Compliance — what the law forces into the software

Researched 2026-09-25 against primary sources (regulations, gateway docs,
customs and tax authorities); every claim that matters carries its source in
RESEARCH.md §5. Items marked **(confirm)** came from secondary sources or standard
knowledge and need a tax adviser or lawyer before launch. **This document is
engineering input, not legal advice** — its job is to make sure the software can
do whatever the advisers decide, and to name what it must never do.

---

## 1. The five findings that change the build

| # | Finding | What the software must do |
| - | ------- | ------------------------- |
| 1 | **Exporting antiques from Indonesia is restricted.** Permendag 22/2023 (4th amendment Permendag 6/2026, in force 1 Apr 2026) bans export of ex-HS 9706 antiques over 100 years that meet its heritage criteria, and ex-9705.10 collections of historical interest 50+ years old. UU 11/2010 lets designated cultural heritage leave only for research, promotion or exhibition with a ministerial permit; penalties reach 10 years and Rp 1.5 bn. The ban works on criteria at the border — *not being formally designated is no safe harbour*. | Every unique item records **where it physically is** and its **export status** (`cleared` · `domestic-only` · `permit-pending` · `not-applicable`), from the owner's item register — **never defaulted**. An item with either field blank sells **nowhere** online (enquiry only); international checkout is **blocked** for an item in Indonesia that is not cleared. International stock is expected to sit outside Indonesia. |
| 2 | **Domestic Indonesian transactions must be in rupiah, and dual quotation is banned** — BI forbids showing IDR and a foreign currency side by side, websites included (UU 7/2011 art. 21 & 33; BI circulars). International trade is exempt. | **Currency follows the delivery country, not the visitor's IP.** Delivering in Indonesia → IDR only, with no "≈ USD" beside it. Exporting → the buyer's currency is allowed. |
| 3 | **An Indonesian PT can only charge in IDR** — Xendit (BI rule), Midtrans and DOKU all settle IDR; Stripe Indonesia is invite-only preview. Stripe Singapore is fully available with multi-currency settlement. | A brand may have **more than one seller of record** (BRANDS.md §3), each with its own entity, currency, tax regime and gateways. Checkout routes to one seller. |
| 4 | **Payment channels have hard per-transaction caps**: QRIS IDR 10 m (PADG 3/2025); e-wallets 20 m verified / 2 m unverified; Alfamart/Indomaret 5 m; Kredivo 30 m; BCA VA 50 m on Xendit (up to 20 bn on Midtrans); Mandiri/BNI/BRI VA up to 50 bn. | **Payment methods are filtered by amount**, currency and seller. A USD 12,000 map never shows a QRIS button that would fail. |
| 5 | **Couriers do not insure art properly**: FedEx caps art and antiques at USD 1,000 declared; DHL restricts fine art and may exclude it from value protection unless endorsed in writing. | Shipping for originals above a threshold is **quote-based with separate fine-art transit insurance**, recorded on the shipment; the checkout never implies courier cover it cannot give. |

## 2. Entities and sellers of record

The live Indies Gallery site says "based in Singapore" beside a +62 number and a
Jakarta gallery; Old East Indies trades from Denpasar and describes itself as
"Bali, Singapore & Jakarta". The research therefore plans for both scenarios:

| | IG = Singapore Pte Ltd | IG = Indonesian PT | OEI = Indonesian PT |
| - | ---------------------- | ------------------ | ------------------- |
| Main gateway | Stripe SG — cards, Apple/Google Pay, PayNow, iDEAL/SEPA for EU buyers | Midtrans (or Xendit/DOKU) — foreign cards charged in IDR | **Midtrans** — cheapest for small tickets, GoPay native, no minimum fees; DOKU alternative; Xendit only if its tooling is worth its Oct-2026 fees |
| Charge / settle | USD, EUR, SGD, AUD… / multi-currency settlement | IDR / IDR | IDR / IDR |
| High value | Stripe Invoicing / Payment Links; above ~USD 5–10k bank transfer to SG accounts | Mandiri/BNI/BRI VA (to 50 bn); USD export invoices by SWIFT (trade exemption) | payment links over WhatsApp |
| Secondary | PayPal SG | PayPal ID (no IDR in PayPal itself; withdraw to IDR) | QRIS in the showroom |

**Consequences the engine supports without code changes:**

- **Two sellers inside one brand.** A Singapore seller for items held in
  Singapore and sold abroad; an Indonesian seller for items held in Jakarta and
  sold domestically — each invoicing in its own currency with its own tax.
  Selling Jakarta stock to an Indonesian buyer through a Singapore company is a
  permanent-establishment and invoicing risk the advisers must rule on
  **(confirm)**; the config expresses whichever answer they give.
- **One gateway, two merchant accounts** is fine if both brands are Indonesian
  PTs — but never run one company's sales through the other's account; it breaks
  tax invoicing and seller-identity rules.
- The seller's legal identity (name, address, NIB or UEN) is shown in the footer
  and on every order document (PP 80/2019).

## 3. Tax

**Indonesia (PPN)** — PMK 131/2024, unchanged for 2026: nominal 12% on a tax base
of 11/12 of the price, so **11% effective on non-luxury goods**; 12% only on
PPnBM luxury goods (art and antiques are not on those lists **(confirm)**).
Exports are zero-rated. Only a PKP (VAT-registered, mandatory above Rp 4.8 bn
turnover) charges PPN, issuing e-Faktur through Coretax. Below it, a PT may use
the PP 55/2022 0.5% final tax — for three years only **(confirm)**.

**Singapore (GST)** — 9%. Registration compulsory above S$1 m taxable turnover
(standard- plus zero-rated), with exemption possible when over 90% of sales are
zero-rated. Exports are zero-rated if goods leave within 60 days with export
evidence. Sales shipped Jakarta → overseas without passing through Singapore are
out of scope. Importing stock into Singapore attracts 9% import GST.

**What the buyer pays on arrival** (shown before payment, never as a surprise):

| Destination | Originals (antiques) | Merchandise |
| ----------- | -------------------- | ----------- |
| Netherlands / EU | 9% import VAT on antiques over 100 years (NL); EU Reg. 2019/880 importer statement for cultural goods **over 200 years and over €18,000 made outside the EU** (a map printed in Amsterdam is exempt; one made in Batavia is not, and needs proof of lawful export) | VAT + a flat **€3 duty per item** on parcels under €150 from 1 Jul 2026 (IOSS sellers) |
| United States | antiques (9706) and maps normally duty-free; check the current surcharge regime on the day — de minimis is suspended indefinitely | duties per HTS; no de minimis |
| Australia | 10% GST at the border above A$1,000 | vendor-collected GST under A$1,000 once registered (A$75k threshold) **(confirm)** |
| Singapore | 9% import GST | 9% GST (overseas-vendor regime to S$400) |

The engine models this as a **duties estimate per destination** shown on the PDP
and at checkout, with DAP as the default and DDP (duties paid) as a per-seller
option — refused deliveries of a USD 8,000 map because of an unexpected VAT bill
are what DDP prevents.

## 4. HS codes and export documents

Chapter 97 takes priority. Maps and prints over 100 years → **9706** (9706.10 if
over 250 years). Under 100 years: maps **4905**, prints and photographs
**4911.91**. Merchandise by product type (posters 4911, textiles 63xx, mugs
6912…). The HS code is stored on the work (derived from object type and age) or
on the product type, and printed on the commercial invoice the engine generates
for every international shipment.

Singapore: antiques are not on the controlled export list; commercial air exports
over S$1,000 need a TradeNet permit, normally filed by the courier.

## 5. Imports into Indonesia (print-on-demand)

PMK 96/2023 as amended (111/2023, 4/2025): courier parcels duty-free only to USD 3;
a flat 7.5% to USD 1,500; normal MFN tariffs for bags (15–20%), textiles (5–25%)
and footwear. **Print locally for Indonesian orders; use overseas
print-on-demand only for orders shipped abroad.** The fulfilment router enforces
this (COMMERCE.md §8).

## 6. E-commerce, consumer and language law (Indonesia)

- **PSE registration** (Permenkominfo 5/2020 as amended) through OSS — required
  for any e-commerce system operator; sanctions reach access blocking.
- **PP 80/2019**: complete seller identity and legality, accurate product, price,
  payment and delivery terms.
- **UU 8/1999 art. 18** bans standard clauses letting the seller refuse returns or
  refunds — **no "all sales final"**, including for made-to-order prints. The
  returns policy is drafted by counsel; the software supports return requests
  on every order line.
- **UU 24/2009**: agreements with Indonesian parties in Bahasa Indonesia →
  terms, privacy notice and order documents exist in Indonesian and English.
- **Permendag 31/2023**: social media may promote, not process payments —
  Instagram and WhatsApp link to the site or send a payment link, never take
  payment in-chat.

## 7. Personal data

- **UU PDP (Law 27/2022) + PP 33/2026** — signed 16 Jul 2026, **full effect 16 Jan
  2027**: a privacy notice with its required elements; consent separate from
  terms; breach notice to people and the regulator within **3 × 24 hours**; a
  record of processing (≥ 13 elements); cross-border transfer safeguards
  (Stripe, Cloudflare and any foreign host count); fines up to 2% of revenue.
- **Singapore PDPA** — a data protection officer is required for every
  organisation **(confirm)**.
- **EU visitors** — GDPR-grade cookie consent: IG sells to the Dutch heritage
  market.
- **A retailer's application is personal data even when it never becomes a
  partner.** One declined or left pending has no order behind it, so it needs
  its own retention period, not the customer record's — **the period is
  counsel's to confirm**; a purge job then removes it, and it is included in
  the 28.4 export/erase flow and the record of processing like any other
  personal data.

The engine provides: consent records with policy version and timestamp per
purpose (marketing email, WhatsApp, analytics, **want-list alerts** —
separate from marketing email, since a want list may be kept by someone who
never subscribed to anything else), a processing-record export, a
data-subject export and deletion flow, retention jobs — a declined or
never-approved retailer application purged on counsel's schedule, and an
email want list never confirmed purged after **7 days** — and a breach
runbook in `manual/`. Marketing opt-in is always a separate, unticked
checkbox; a want-list alert is consented to at the same **double opt-in**
that confirms the address (D39), and stopping the alert erases the list
whole — its address, its query and its consent together — so nothing of it
remains for the record of processing to still cover.

## 8. Rights in the images

- **Willem Hofker died in 1981** — under life + 70 in both Indonesia and the
  Netherlands his work is likely protected until **2051**. The Hofker Bali Hotel
  posters are OEI's hero line: **confirm the licence or estate position before
  scaling them**, especially on EU sales and marketplaces. Céphas (d. 1912),
  Nieuwenkamp (1950) and Tyra Kleen (1951) are out of copyright.
- **A faithful scan of a public-domain work earns no new copyright in the EU**
  (DSM Directive art. 14). OEI's protection is brand, curation and print
  quality — not the scan.
- Every work carries `rights` — status, holder, licence reference, territories,
  expiry — and **reproduction products cannot be published for a work whose
  rights do not allow it**. That is a publish guard, not a reminder.

## 9. Payments hygiene

Hosted fields or redirects only (PCI SAQ-A). 3DS2 on every card payment (it moves
fraud liability, not "not as described" claims). Ship originals only after funds
settle; signature on delivery; screen freight-forwarder addresses. Keep the
condition report, photos and certificate with the order. Virtual-account and
retail-outlet payments **cannot be refunded through the gateway** — the refund
flow records a manual bank refund for them. Xendit's repricing from 1 Oct 2026
(per-attempt processing fee, USD 50 monthly minimum, USD 25 per dispute) is why
Midtrans is the OEI default.

## 10. Checklist

**Before launch — Old East Indies**

- [ ] NIB with the internet-retail and shop KBLI codes, NPWP **(confirm)**
- [ ] PSE registration through OSS
- [ ] Seller identity on the site; Indonesian + English terms and privacy notice
- [ ] Returns policy compliant with UU 8/1999 art. 18 (counsel)
- [ ] IDR-only pricing for Indonesian delivery (enforced by the engine)
- [ ] Gateway KYC (Midtrans) + showroom QRIS
- [ ] PDP basics: notice, separate consent, processor contracts, breach plan
- [ ] Decision: 0.5% final tax vs PKP registration
- [ ] **Hofker rights confirmed** before the hero line launches

**Before launch — Indies Gallery**

- [ ] Selling entity(ies) decided with a tax adviser; stock locations declared
- [ ] Stripe SG (if Singapore) and/or Indonesian gateway KYC
- [ ] PDPA DPO and policies (if Singapore); EU cookie consent
- [ ] GST / PKP registration decision
- [ ] **Item register**: age, HS code, place of creation, provenance, location,
      export status for every item (the migration fills most of it)
- [ ] Written export determination for any item in Jakarta that may be sold abroad
- [ ] Fine-art transit insurance policy
- [ ] Terms: condition, authenticity guarantee, returns, duties and taxes

**Later**

- [ ] Full PP 33/2026 compliance by **16 Jan 2027**
- [ ] EU IOSS registration (merch), Australian GST past A$75k
- [ ] Singapore overseas-vendor GST registration for OEI if thresholds are reached
- [ ] Reassess Stripe Indonesia and Airwallex Indonesia in 2027
