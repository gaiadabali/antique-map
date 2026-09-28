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
   (`extend()`); card and wallet methods that support it authorise first and
   **capture only while the reservation is live**; cash-at-retail is never offered
   for a unique item. No payment completes against an expired reservation
   without going through rule 5.
5. **A payment that arrives late is never kept silently.** If the item is still
   available it is re-reserved and sold to that buyer; if not, it is refunded
   automatically — or its authorisation voided — and the buyer is told why, the
   same minute.
6. **Idempotency lives in the domain, not the adapter.** Adapters are stateless;
   the domain stores each attempt's `SessionResult` and returns it when the buyer
   retries, and gives each attempt its own provider reference (Midtrans rejects a
   reused `order_id`).

## 2. The contract (C7)

```ts
// engine/packages/payments/src/contract.ts            @contract C7
type ProviderId = 'manual' | 'bank-transfer' | 'stripe' | 'midtrans' | 'xendit' | 'doku' | 'paypal'

interface PaymentGateway {
  readonly id: ProviderId

  /** What this provider can do for this checkout — or null if it cannot serve it at all. */
  capabilities(ctx: {
    seller: SellerConfig; charge: Money; destination: CountryCode; buyer: 'retail' | 'institution' | 'trade'
  }): { methods: PaymentMethod[]; chargeCurrency: CurrencyCode;
        sessionTtl: Duration;        // how long this method can take — drives extend()
        refunds: 'full' | 'partial' | 'manual-only'; authCapture: boolean } | null

  /** attemptId becomes the provider reference (one per attempt). The DOMAIN stores the
   *  returned SessionResult and replays it on retry — the adapter keeps no state. */
  createSession(input: {
    attemptId: string; orderRef: string; charge: Money; display?: Money; fx?: FxSnapshot
    method?: PaymentMethod; customer: Contact; lines: LineSummary[]
    returnUrls: { success: string; cancel: string }; expiresAt: Date
  }): Promise<SessionResult>

  retrieve(providerRef: string): Promise<{
    state: 'pending' | 'requires_action' | 'paid' | 'failed' | 'expired' | 'refunded' | 'partially_refunded'
    paid?: Money
  }>

  /** Verifies the signature (throws WebhookSignatureError) and normalises. */
  parseWebhook(req: { headers: Headers; rawBody: string }): Promise<NormalizedPaymentEvent[]>

  refund(input: { providerRef: string; amount: Money; reason: string; idempotencyKey: string }): Promise<RefundResult>
  capture?(providerRef: string, amount: Money): Promise<void>   // authCapture methods
  cancel?(providerRef: string): Promise<void>                    // void an authorisation / expire a session
}

type SessionResult =
  | { kind: 'redirect'; url: string; expiresAt: Date }                          // Midtrans Snap, Xendit, PayPal, Stripe Checkout
  | { kind: 'embedded'; clientSecret: string; publishableKey: string }          // Stripe Payment Element
  | { kind: 'instructions'; reference: string; va?: string; bank?: BankDetails; expiresAt: Date } // VA, bank transfer
  | { kind: 'qr'; qrString: string; expiresAt: Date }                           // QRIS
  | { kind: 'manual'; note: LocalisedText }                                     // KOI's truthful "settled on WhatsApp"

type NormalizedPaymentEvent = {
  providerEventId: string        // the dedup key — unique in payment_events; DERIVED PER ADAPTER:
                                 //   Stripe / PayPal: their event id;
                                 //   Midtrans (no event id in its notifications): a hash of
                                 //   transaction_id | transaction_status | fraud_status | status_code,
                                 //   so "pending" and the later "settlement" are distinct events
  providerRef: string            // the provider's payment id, mapped to our attempt
  type: 'paid' | 'failed' | 'expired' | 'refunded' | 'partially_refunded' | 'disputed' | 'dispute_closed'
  amount?: Money
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
                      .filter(itemConstraints)       // price-on-request never; export-blocked items never;
                                                     // cash-at-retail never for a unique item
                      .filter(riskPolicy)            // cards above the seller's ceiling → bank transfer / invoice
                      .sort(seller.methodOrder)
```

The caps are **data** (`payments/src/limits.ts`, sourced and dated), because
they change — QRIS moved to IDR 10 m under PADG 3/2025. A method that would fail
at the provider is never shown.

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
POST /api/x/webhooks/payments/{provider}
  → adapter.parseWebhook()          signature verified on the RAW body; failure → 401 + alert
  → adapter.retrieve()              where the provider advises it (Midtrans): confirm the status
                                    from the provider's API before trusting the notification
  → domain.applyPaymentEvent()      ONE transaction, in this order:
        1. INSERT payment_events (provider, provider_event_id) ON CONFLICT DO NOTHING RETURNING id
           no row → it is a duplicate → commit the no-op → 200
        2. payment state + reservation conversion + order state + domain_events (outbox)
        any failure → ROLLBACK (the dedupe row goes too) → 5xx → the provider retries
  → 200
```

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
  `refund()` is called with an idempotency key; methods that cannot refund
  through the gateway produce a **manual refund task** with the buyer's bank
  details, tracked to completion.
- **Disputes** move the order to `disputed`, attach the evidence pack the order
  already holds (condition report, photos, certificate, delivery signature) and
  notify the manager.
- **Payment links** serve accepted offers, staff holds, institutional invoices and
  WhatsApp sales: `/pay/{token}` shows the seller, the amount, the expiry and the
  methods routing allows. The hold is sized to outlast the method the buyer picks
  (rule 4).

## 6. Providers per brand — the defaults

Final choices depend on the entity decisions (COMPLIANCE.md §2). The engine
supports all of these; the table is what each brand's config starts with.

| Seller | Providers (in order) | Charge currency | Notes |
| ------ | -------------------- | --------------- | ----- |
| **IG · Singapore** | `stripe` (cards, Apple/Google Pay, PayNow, iDEAL/SEPA) · `bank-transfer` (proforma, USD/EUR/SGD) · `paypal` (optional) | USD by default; EUR/SGD/AUD where priced | Stripe Invoicing / Payment Links for inquire → pay; above ~USD 5–10k steer to bank transfer |
| **IG · Indonesia** (if Jakarta stock is sold domestically) | `midtrans` (Mandiri/BNI/BRI VA for high value, cards in IDR) · `bank-transfer` (IDR) | IDR only | |
| **OEI · Indonesia** | `midtrans` (QRIS, GoPay, ShopeePay, OVO, DANA, VA, cards, Alfamart/Indomaret, Akulaku/Kredivo) · `bank-transfer` (trade/B2B) · `paypal` (international buyers, USD) | IDR (PayPal: USD) | the showroom's QRIS on the same Midtrans account |
| **OEI · Singapore** (optional, v2) | `stripe` | buyer currency | international orders fulfilled by print-on-demand abroad |

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
because OEI launches on it). The Integrations stage adds Stripe, PayPal and, only if chosen,
Xendit or DOKU. Every adapter passes the **shared contract suite**
(`tests/contract/payments/*`) against recorded sandbox fixtures, including
signature failure, duplicate delivery, out-of-order delivery and refund
idempotency — and four cases the money path depends on:

- **apply throws after the dedupe insert → the provider's retry is applied once**;
- **`pending` then `settlement` for one Midtrans order → paid** (the two
  notifications must not dedupe each other);
- **a Stripe Checkout session is created with `expires_at` ≥ 30 minutes** and the
  reservation is extended to match;
- **a payment after the item sold elsewhere → automatic refund or voided
  authorisation**, and the buyer is told.

## 8. Secrets

Per seller, per provider, per environment: `PAYMENT_<SELLER>_<PROVIDER>_*`
(e.g. `PAYMENT_ID_MIDTRANS_SERVER_KEY`). The boot check fails if a configured
provider has no secrets, or if a sandbox key meets `NODE_ENV=production`
(and the reverse). Publishable keys reach the browser only on the payment step.
