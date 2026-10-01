# Payments

How money is taken, for two brands, possibly four sellers of record, and at
least four gateways — through one seam. KOI's `lib/commerce/gateway.ts` is the
ancestor: *take a priced order, give back either "you settle this yourself" or
"send them here"*. This widens it to what the researched providers actually
return, and no further.

---

## 1. The rules

1. **Adapters are stateless translators.** They turn a priced payment attempt
   into a provider session, and a provider webhook into normalised events.
   **All state lives in `@engine/domain`** — the payment, reservation and order
   state machines (COMMERCE.md §6). An adapter never writes an order.
2. **The amount is never the browser's.** An attempt is created server-side from
   the order's computed total in the seller's charge currency (COMMERCE.md §3).
3. **One transaction decides — dedupe included.** The webhook's dedupe row, the
   payment, the reservation's conversion and the order's move to `paid` are
   written together, or none of them are. If anything fails, the dedupe row rolls
   back with the rest and the webhook answers 5xx, so the provider's retry is
   applied rather than swallowed as a duplicate.
4. **The reservation outlives the payment window.** When the buyer picks a method,
   the checkout lock is extended to that method's session lifetime plus a margin
   (`extend()`) — never below the method's own floor (`minSessionTtl`, Stripe
   Checkout's 30 minutes): a method whose floor no longer fits before the lock's
   ceiling or the hold's end is not offered, and a start that finds so answers
   `window-too-short`; card and wallet methods that support it authorise first and
   **capture only while the reservation is live**; cash-at-retail is never offered
   for a unique item. No payment completes against an expired reservation
   without going through rule 5. Authorising first matters for a **checkout lock**,
   which lasts minutes; a staff-sent link's lock lasts as long as the invoice hold it
   supersedes — days, to the due date (D45) — so the gallery's card payments on its
   own pay page capture at once, and Stripe Checkout Sessions, a Stripe-hosted page,
   are not used (§5).
5. **A payment that arrives late is never kept silently.** If the item is still
   available it is re-reserved and sold to that buyer; if not, it is refunded
   automatically — or its authorisation voided — and the buyer is told why, the
   same minute.
6. **Idempotency lives in the domain, not the adapter.** Adapters are stateless;
   the domain stores each attempt's `SessionResult` and returns it when the buyer
   retries, and gives each attempt its own provider reference (Midtrans rejects a
   reused `order_id`). A retry while the first call may still be running — within
   the attempt's lease, `PAYMENT_ATTEMPT_LEASE` — waits (`rate-limited`) and never
   voids a live attempt; only past the lease is a missing session a crash.
7. **Every figure an adapter passes is in the engine's units.** Every `Money` in or
   out of an adapter is C5's minor units; the adapter converts at its boundary
   (IDR in hundredths) and never rounds: a figure that is no whole minor unit
   comes back as `InexactMoney`, as the provider wrote it, and is flagged for a
   human, never paid.

## 2. The contract (C7)

The code is the contract (`engine/packages/payments/src/contract.ts`, with the
vocabulary it shares with the domain in `domain/src/contracts/payment-vocabulary.ts`);
this sketch abbreviates it.

```ts
// engine/packages/payments/src/contract.ts            @contract C7
type ProviderId = 'manual' | 'bank-transfer' | 'stripe' | 'midtrans' | 'xendit' | 'doku' | 'paypal'  // C1's

type PaymentGateway = {
  readonly id: ProviderId
  readonly sellerId: string                      // one instance per seller account: secrets are per seller (§8)
  readonly authCapture: boolean                  // true → capture() and cancel() are required
  readonly confirmWebhooksByRetrieve: boolean    // Midtrans: confirm a notification before applying it

  /** What this provider can do for this checkout — or null if it cannot serve it at all. */
  capabilities(ctx: {
    seller: SellerConfig; charge: Money; destination: CountryCode
    buyer: 'retail' | 'institution' | 'trade'; hasUniqueItem: boolean
  }): { chargeCurrency: CurrencyCode
        methods: { method: PaymentMethod            // granular: 'va-bca', 'gopay', 'card' … each in one C1 family
                   sessionTtl: Duration              // PER METHOD — how long it can take; drives extend()
                   minSessionTtl: Duration           // the provider's floor: never cut below; else not offered
                   presentation: SessionResult['kind']  // what createSession() will return: told before choosing
                   authCapture: boolean
                   refunds: 'full' | 'partial' | 'manual-only'
                   cap: Money | null }[] } | null

  /** attemptId is OUR reference: committed before this call, echoed back on every event. The
   *  DOMAIN stores the returned SessionResult and replays it on retry — the adapter keeps no state.
   *  charge is C5's minor units; an adapter whose provider counts differently (IDR in hundredths)
   *  converts on the way in and on the way out — never in the domain, never twice. */
  createSession(input: {
    attemptId: string; orderRef: string; charge: Money; display: Money | null; fx: FxSnapshot | null
    method: PaymentMethod | null; customer: Contact; lines: LineSummary[]
    returnUrls: { success: string; cancel: string }; expiresAt: Date
  }): Promise<SessionResult>

  /** By the provider's id once it has named the payment, else by our reference. */
  retrieve(lookup: { attemptRef: string; providerRef: string | null }): Promise<{
    state: 'pending' | 'requires_action' | 'authorised' | 'paid' | 'failed' | 'expired' | 'voided'
         | 'refunded' | 'partially_refunded' | 'unknown'
    paid: Money | null; refundedTotal: Money | null
  }>

  /** Verifies the signature on the RAW body. A bad signature is a value (→ 401 + alert), never a throw. */
  parseWebhook(req: { headers: Headers; rawBody: string }): Promise<
    | { kind: 'events'; events: NormalizedPaymentEvent[] }
    | { kind: 'bad-signature' }
    | { kind: 'ignored'; reason: string }>

  refund(input: { providerRef: string; amount: Money; reason: string
                  idempotencyKey: `late:${string}` | `dup:${string}` | `staff:${string}` }): Promise<RefundResult>
  capture?(providerRef: string, amount: Money): Promise<void>        // authCapture gateways
  cancel?(lookup: { attemptRef: string; providerRef: string | null }): Promise<void>  // void / expire a session
}

type SessionResult =
  | { kind: 'redirect'; url: string; expiresAt: Date }                          // Midtrans Snap, Xendit, PayPal, Stripe Checkout
  | { kind: 'embedded'; clientSecret: string; publishableKey: string }          // Stripe Payment Element
  | { kind: 'instructions'; reference: string; virtualAccount: string | null
      bank: BankDetails | null; expiresAt: Date }                               // VA, bank transfer
  | { kind: 'qr'; qrString: string; deeplink: string | null; expiresAt: Date }  // QRIS
  | { kind: 'manual'; note: LocalisedText }                                     // KOI's truthful "settled on WhatsApp"

type NormalizedPaymentEvent = {
  provider: ProviderId
  sellerId: string               // the account it came from: a webhook arrives on its seller's route
  source: 'webhook' | 'retrieve' | 'staff'
  providerEventId: string        // with provider + sellerId, the dedup key in payment_events; DERIVED PER ADAPTER:
                                 //   Stripe / PayPal: their event id;
                                 //   Midtrans (no event id in its notifications): a hash of
                                 //   transaction_id | transaction_status | fraud_status | status_code
                                 //   | the refunded total, so "pending" and the later "settlement"
                                 //   are distinct events, and so are two partial refunds;
                                 //   `retrieve:…` for the reconciler's events, `staff:…` for staff entries
  attemptRef: string | null      // our reference, echoed back: the attempt is found by it first
  providerRef: string            // the provider's payment id
  type: 'pending' | 'requires_action' | 'authorised' | 'paid' | 'failed' | 'expired' | 'voided'
      | 'refunded' | 'partially_refunded' | 'disputed' | 'dispute_closed'
  // figures are ProviderMoney: C5's Money when exact, else InexactMoney as the provider wrote it
  // per type: amount (authorised, paid, refunds, disputed) · refundedTotal + refundRef (refunds)
  // · reasonClass + providerCode (failed) · outcome + disputeRef (dispute_closed)
  occurredAt: Date
}
```

`manual` stays a real answer, not a stub (KOI): an order settled on WhatsApp or
by transfer is recorded exactly like a gateway order, and the confirmation says
so in the editor's own words.

## 3. Routing — which options a buyer sees

```
checkout → seller = routeSeller(stockLocations, destination)          (COMMERCE.md §2)
        → providers = seller.payments
        → options   = providers.flatMap(p => p.capabilities(ctx)?.methods)
                      .filter(amountCaps)            // QRIS ≤ IDR 10 m, e-wallet ≤ 20 m, retail ≤ 5 m …
                      .filter(itemConstraints)       // a price-on-request item never from a list — a line
                                                     // priced by an agreement (an invoice, a quote) is priced;
                                                     // export-blocked items never;
                                                     // cash-at-retail never for a unique item
                      .filter(riskPolicy)            // cards above the seller's ceiling → bank transfer / invoice
                      .sort(seller.methodOrder)
```

The caps are **data** (`payments/src/limits.ts`, sourced and dated), because
they change — QRIS moved to IDR 10 m under PADG 3/2025. A method that would fail
at the provider is never shown.

**Each option the page offers (C6 `PaymentOptionView`) says, before the buyer
chooses:** its `family` — C1's grouping (card, e-wallet, VA, retail, paylater,
bank-transfer, express-wallet, PayPal, QRIS, PayNow, iDEAL, SEPA…), which is how
the page groups the methods rather than listing every granular one flat — its
`presentation` (C7 `MethodCapability.presentation`: the `SessionResult` kind
`createSession()` will return — a redirect, an embedded card form, a virtual
account to pay from a bank app, a QR, or settled off-platform), and its
`sessionTtl` — "pay within 15 minutes" is true because the domain reads it to
size `extend()` (rule 4), cut to end before the lock or hold behind it but never
below the method's floor (`minSessionTtl`): a method whose floor no longer fits
is left out here rather than started and cut short. Once a session starts, `PaymentStarted.dailyCapWarning`
is set when the amount is above the daily transfer limit many buyers' banks set
for that method — a VA or a bank transfer, checked against the dated limits
beside the caps above — so the payment-pending page warns before a transfer
fails at the buyer's own bank, not at the provider's.

| Method | Cap per transaction | Refund |
| ------ | ------------------- | ------ |
| QRIS | IDR 10 m | issuer-dependent, often full only, 7-day window |
| E-wallets (GoPay, OVO, DANA, ShopeePay) | IDR 20 m verified / 2 m unverified | partial on OVO/DANA; GoPay full only |
| Alfamart / Indomaret | IDR 5 m (Alfamart cash 2.5 m) | **none via gateway — manual bank refund** |
| Kredivo / Akulaku | IDR 30 m (Kredivo on Xendit) | provider flow |
| BCA VA | IDR 50 m (Xendit) · up to 20 bn (Midtrans) | **none via gateway — manual bank refund** |
| Mandiri / BNI / BRI VA | up to IDR 50 bn | **manual bank refund** |
| Cards | seller risk ceiling | full and partial |

The buyer's own bank also caps daily transfers, so the instructions page for a
large VA payment says so rather than letting it fail mysteriously.

## 4. Webhooks, idempotency, reconciliation

```
POST /api/x/webhooks/payments/{provider}/{seller}
  → adapter.parseWebhook()          signature verified on the RAW body, with this seller's secret;
                                    failure → 401 + alert
  → adapter.retrieve()              where the provider advises it (Midtrans): confirm the status
                                    from the provider's API before trusting the notification
  → domain.applyPaymentEvent()      ONE transaction (a short one precedes it for an authorised
                                    event only, to secure the reservation before any capture):
        1. find the attempt by our attemptRef, else by (provider, sellerId, providerRef) — none, or
           one of another seller: recorded in payment_events_unmatched, alerted, dedupe key NOT
           consumed (→ unknown-attempt), so it still applies once the attempt turns up
        2. INSERT payment_events (provider, seller_id, provider_event_id, attempt_id)
           ON CONFLICT DO NOTHING RETURNING id — no row → duplicate → commit the no-op → 200
        3. lock the order, then the attempt (FOR UPDATE), and classify: a move the table has →
           apply; ranked at or below the attempt → ignored-stale; ranked above (early) →
           retrieve() and apply the provider's state first, then the event → caught-up
        4. apply: payment state + reservation conversion + order state + domain_events (outbox)
        any failure → ROLLBACK (the dedupe row goes too) → 5xx → the provider retries
  → 200
```

Secrets, and so this route, are **per seller**: two sellers on one provider
never share a dedupe key space (`payment_events`'s unique key is `provider,
seller_id, provider_event_id`). `applyPaymentEvent()` answers one of eight
outcomes — `applied` · `caught-up` · `duplicate` · `late-payment-resolved` ·
`duplicate-payment-refused` · `ignored-stale` · `unknown-attempt` · `flagged`
(C8 `ApplyPaymentEventOutcome`) — the handler answers 200 for every one of
them; only a throw answers 5xx, so the provider retries.

- `applyPaymentEvent` and the payment state machine belong to the **domain**
  (`@engine/domain`); the payments lane owns only the adapters, routing and the
  HTTP handler.
- Events can arrive out of order; the payment state machine only moves forward,
  so a late `pending` after `paid` changes nothing.
- An event for an unknown payment is logged, alerted and answered `200` — a
  `500` would make the provider retry forever.
- **Reconciliation** (every 10 min, DEPLOYMENT.md §5) calls `retrieve()` for every
  attempt still pending past its expected window and applies the result through
  the same `applyPaymentEvent`. A webhook that never arrived cannot leave an
  order pending forever.
- Every webhook route is rate-limited, logs a redacted payload hash, and never
  echoes provider errors to the caller.

## 5. Refunds, disputes, payment links

- **Refunds** are requested in the admin against an order line or amount;
  `refund()` is called with a **deterministic idempotency key** — `staff:{refundId}`
  for a refund staff asked for, `late:{attemptId}` for a late payment refused,
  `dup:{attemptId}` for a duplicate — so asking again after a timeout, a rollback
  or a crash refunds once. Money the domain owes back is recorded as owed before
  the provider is asked; if the provider cannot be reached, the reconciler asks
  again under the same key until it answers. Methods that cannot refund through
  the gateway produce a **manual refund task** with the buyer's bank details,
  tracked to completion. A refund counts once, by the rise in the provider's
  running total, however many times a webhook or `retrieve()` reports it.
- **A second payment on an order already paid** — a VA and then a QRIS both
  settled — is given back whole, automatically (`dup:{attemptId}`), and the buyer
  told; the order and its own payment are untouched.
- **A refund issued at the provider** (in its dashboard, not in the admin) is
  recorded against its attempt and alerted to staff; the order stands and its item
  stays sold until staff cancel the order or accept a return. A refund alone never
  puts a one-of-one item back on sale.
- **Disputes** are the payment's (`disputed → dispute_won | dispute_lost`), never
  an order status: the order stands, the evidence pack it already holds
  (condition report, photos, certificate, delivery signature) is attached, and the
  manager notified. A lost dispute is alerted like a refund at the provider.
- **Payment links** serve **the gallery's staff-issued invoices** — its one way to
  sell an original (D50, COMMERCE.md §7) — institutional proformas, a partner's
  accepted quote and WhatsApp sales (and accepted offers and staff holds, where a
  brand takes them — none at launch): `/pay/{token}` (C6 `payLink.get`, then
  `payLink.start`) shows the seller, the amount, the expiry and the methods routing
  allows. An invoice's link charges its issued lines — the agreed figure, stored in
  the charge currency when staff issue it (C5 `AgreedPrice`), with its FX snapshot
  — never a figure from the request, and stays open until the invoice's due date,
  when its hold ends (D45). Starting a payment supersedes that hold with the order's
  checkout lock, lasting at least as long, so a declined card never costs the buyer
  the piece; the method's session is sized to finish before it (rule 4).
- **The pay page is ours, never the gateway's** (the developer, 2026-10-01). A staff-sent
  link opens the brand's own `/pay/{token}` page in the brand's design — for the
  gallery, the invoice itself (COMMERCE.md §7) — with the gateway's embedded element
  inside it (Stripe's Payment Element; Midtrans's for an IDR invoice) and bank transfer
  as the other method. No Stripe Invoicing or Payment Links page, nor any other
  provider-hosted invoice, is used: a buyer coming from a chat must land on a page that
  looks like the seller and names it. The page's states are designed, not discovered:
  **open** ("On hold until {due date}"), **bank transfer pending** (its instructions, and
  that payment must be received and confirmed), **paid**, and **expired** or **voided**
  (staff cancelled it) — the last two with the ways to reach the seller. Staff send the
  link from the order builder on a phone, into the buyer's WhatsApp chat by a `wa.me`
  share, or by email.

## 6. Providers per brand — the defaults

Final choices depend on the entity decisions (COMPLIANCE.md §2). The engine
supports all of these; the table is what each brand's config starts with.

| Seller | Providers (in order) | Charge currency | Notes |
| ------ | -------------------- | --------------- | ----- |
| **IG · Singapore** | `stripe` (cards, Apple/Google Pay, PayNow, iDEAL/SEPA) · `bank-transfer` (invoice and proforma, USD/EUR/SGD) | USD by default; EUR/SGD/AUD where priced; IDR for an Indonesian delivery (D29) | every original is sold on a staff-issued invoice paid through its link (D50): the Payment Element embedded in the gallery's own `/pay/{token}` page — no Stripe-hosted invoice or payment link (§5) — and, above the card ceiling or for an institution, bank transfer against the invoice's PDF |
| **IG · Indonesia** (if Jakarta stock is sold domestically, D1) | `midtrans` (Mandiri/BNI/BRI VA for high value, cards in IDR) · `bank-transfer` (IDR) | IDR only | the same invoice and link, in rupiah; until the Indonesian seller has a Midtrans account (D3), bank transfer alone |
| **OEI · Indonesia** | `midtrans` (QRIS, GoPay, ShopeePay, OVO, DANA, VA, cards — foreign cards charged in IDR —, Alfamart/Indomaret, Akulaku/Kredivo) · `bank-transfer` (trade/B2B) | IDR for every price, total and charge | the showroom's QRIS on the same Midtrans account; no `paypal` at launch (below) |
| **OEI · Singapore** (optional, v2) | `stripe` | buyer currency | international orders fulfilled by print-on-demand abroad; export markets then get price lists of their own |

**PayPal at launch: no** (decided 2026-10-01, TASKS.md 6.4). The shop sells within
Indonesia only at launch (S3), so every order it takes is delivered in Indonesia — a
domestic transaction the rupiah rule requires to be priced and paid in rupiah
(COMPLIANCE.md §1 #2) — and PayPal cannot charge rupiah at all. PayPal was in the
shop's config for buyers abroad alone; with none at launch it could only offer an
Indonesian buyer a dollar charge the law forbids, while Midtrans already takes every
Indonesian method and a visitor's foreign card in rupiah. The gallery never listed it:
Stripe and bank transfer pay its invoices. So no seller lists `paypal` at launch, and
its adapter (TASKS.md 25.2) is built with the shop's export, below — the engine keeps
the provider id and the contract (C1, C7).

**The shop's buyer abroad — D47's design, off at launch** (COMMERCE.md §3). When the
owner opens export, the Indonesian PT prices and charges in rupiah (`charge:
["IDR"]`), for Indonesian and export destinations alike:

| What the buyer sees | Exact or "≈" | Where it comes from |
| ------------------- | ------------ | ------------------- |
| the rupiah price and total | **exact** — what a card is charged, foreign cards included, and what every document and the tax export read | the one IDR price list |
| the market's currency — EUR, AUD, SGD or USD by ship-to | **"≈"**, display only, whole units, never charged | the rupiah at the day's reference rate, no buffer (C5 `PriceSet` `converted`) |
| PayPal's charge, in USD | **exact**, from the payment step on | the order's rupiah total converted once at the day's rate plus the brand's USD buffer, half-even to the cent (`fx-conversion`), shown on the PayPal option before the buyer picks it and stored on the payment attempt as its charge, with its FX snapshot |

So PayPal is offered for a rupiah order, but never asked to charge rupiah:
`capabilities()` answers `chargeCurrency: 'USD'` for it, the domain converts the
total once when it starts the attempt, and the attempt's `charge` is that dollar
figure while the order stays in rupiah. A refund of it is the refunded rupiah at
the attempt's own rate, never the day's, and never above what the attempt took.
Which methods a buyer abroad is offered is routing's (§3); the card and PayPal are
the two this design expects. That the PT may take US dollars through PayPal for
an export sale, and whether PayPal's conversion carries a buffer, are the adviser's
and the owner's to confirm (D2) when export opens.

**Fees at the time of research** (for the config's method ordering, not for
display): Midtrans cards 2.9% + IDR 2,000, VA IDR 4,000, QRIS 0.7%,
GoPay/ShopeePay 2%, OVO/DANA 1.5%, retail IDR 5,000; Stripe SG 3.4% + S$0.50
(+0.5% international, +2% FX), PayNow 1.3%, Invoicing 0.4% capped at S$2;
PayPal SG 4.4% international. Xendit's repricing from 1 Oct 2026 (per-attempt
fee, USD 50 monthly minimum, USD 25 per dispute) made a IDR 100k QRIS payment
cost ~IDR 4,700 there against ~IDR 700 on Midtrans or DOKU — hence the OEI
default.

## 7. Build order

The Commerce stage ships the contract, `manual` and `bank-transfer`, the routing, the
webhook pipeline, reconciliation and **one real adapter in sandbox** (Midtrans,
because OEI launches on it). The Integrations stage adds Stripe (the gallery's
invoices) and, only if chosen, Xendit or DOKU; PayPal waits for the shop's export
(§6). Every adapter passes the **shared contract suite**
(`tests/contract/payments/*`) against recorded sandbox fixtures, including
signature failure, duplicate delivery, out-of-order delivery and refund
idempotency — and the cases the money path depends on:

- **apply throws after the dedupe insert → the provider's retry is applied once**;
- **`pending` then `settlement` for one Midtrans order → paid** (the two
  notifications must not dedupe each other);
- **a session is never cut below its provider's floor** (`minSessionTtl` — Stripe
  Checkout's 30 minutes, for a brand that uses a hosted session; none does at launch,
  §5) and the reservation is extended to match;
- **a payment after the item sold elsewhere → automatic refund or voided
  authorisation**, and the buyer is told — also when the lock lapsed and no sweep
  had yet abandoned the order;
- **a second attempt paid on an order another attempt already paid → that
  payment refunded whole under `dup:{attemptId}`**, the order untouched;
- **an event for an unknown attempt → 200, recorded apart, alerted — and its
  dedupe key not consumed**, so it still applies if the attempt turns up;
- **a refund reported before the payment it refunds → caught up through
  `retrieve()` and applied once**, never ignored as stale;
- **one refund reported by a webhook and by `retrieve()` → counted once**, by
  the rise in the provider's running total;
- **a refund whose provider call times out → the event still commits with the
  refund owed**, and the reconciler's retry under the same key refunds once.

## 8. Secrets

Per seller, per provider, per environment: `PAYMENT_<SELLER>_<PROVIDER>_<NAME>`,
the seller and provider ids upper-cased with `-` as `_`
(`PAYMENT_ID_MIDTRANS_SERVER_KEY`). The names are the ones the adapters read,
declared in `@engine/config`'s `boot-check/provider-secrets.ts` — an adapter that
needs another adds it there in the same change:

| Provider | `<NAME>`s | Sandbox or live |
| --- | --- | --- |
| `stripe` | `SECRET_KEY`, `PUBLISHABLE_KEY`, `WEBHOOK_SECRET` (`whsec_…`) | the keys say: `sk_test_` / `pk_test_` or `sk_live_` / `pk_live_` (an `rk_` restricted key alike) |
| `midtrans` | `SERVER_KEY`, `CLIENT_KEY` | the keys say: `SB-Mid-server-` / `SB-Mid-client-` or `Mid-server-` / `Mid-client-` |
| `xendit` | `SECRET_KEY`, `WEBHOOK_TOKEN` | the key says: `xnd_development_` or `xnd_production_` |
| `paypal` | `CLIENT_ID`, `CLIENT_SECRET`, `WEBHOOK_ID` | `PAYMENT_<SELLER>_PAYPAL_MODE`: `sandbox` or `live` |
| `doku` | `CLIENT_ID`, `SECRET_KEY` | `PAYMENT_<SELLER>_DOKU_MODE`: `sandbox` or `live` |
| `bank-transfer`, `manual` | none | — |

The environment is read from `SITE_URL` against the brand's `domains`
(DEPLOYMENT.md §1, §8), never from `NODE_ENV` alone, since staging runs production
builds: the brand's production domain or an alias is production and runs on live
keys; its staging domain is staging and runs on sandbox keys, as a workstation
does. The boot check refuses to start on a configured provider's missing secret
(on a deployed host — a workstation is only warned), a key that is not the
provider's, a seller's keys mixing sandbox and live, and a key of the wrong kind
for the environment — a sandbox key in production, a live one anywhere else.
Publishable keys reach the browser only on the payment step.
