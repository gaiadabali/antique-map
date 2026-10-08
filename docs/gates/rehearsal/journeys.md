# 10.3.b launch rehearsal, the journeys (staging)

QA, 2026-10-08/09, against staging `https://indies-gallery.gaiada.com` and `https://old-east-indies.gaiada.com`, release
`production-20261008T143718Z-e8597fd7` (`readlink -f /home/uindies/current` named `...-e8597fd7` before and after every run;
no 502 was met). Suite: `tests/e2e/rehearsal/` (`playwright.config.ts`; projects `mobile` 390x844 and `desktop` 1280x800;
`--workers=1`). Run: `npx playwright test -c tests/e2e/rehearsal/playwright.config.ts --workers=1`. Staff steps read
`E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`, `E2E_STORE_A_EMAIL`, `E2E_STORE_A_PASSWORD` (the 7.x gates' variables). Screenshots:
`docs/gates/rehearsal/shots/`; what each run created: `shots/created.ndjson`.

**Verdict: PARTLY RUN, BLOCKED on staff credentials.** Everything a visitor or buyer does passed at both widths. The three steps
that need an owner or store login did not run, because no staging staff credential exists in the repo, its env files or this
session's environment, and none was invented or created. They fail with `BLOCKED: this staff step needs ...` (a failure, not a skip).

## Steps and results

| Step                                                                              | 390         | 1280        | Notes                                                                                                               |
| --------------------------------------------------------------------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `/api/health` 200 `ok` on both hosts                                              | pass        | pass        | app, boot, database, storage, queue all ok                                                                          |
| Gallery: search "Batavia", open an available work                                 | pass        | pass        | work 200, "The new Governor-General Palace in the Koningsplein Batavia" (`/product/200`); `data-status="available"` |
| Gallery: Ask carries the item                                                     | pass        | pass        | `wa.me/<number>?text=` names the title and the `/product/...` address                                               |
| Gallery: lead form (name "REHEARSAL 10.3")                                        | pass        | pass        | `POST /api/x/leads` 201, thank-you message shown; Turnstile token present                                           |
| Gallery: lead exists (owner read of `/api/leads`)                                 | **BLOCKED** | **BLOCKED** | needs `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`                                                                       |
| Shop: bag a design, checkout with a Bali pin (-8.6705, 115.2126), place the order | pass        | pass        | lands "We're confirming your delivery price" (awaiting quote), "Sending from Denpasar", items total Rp 450.000      |
| Shop: staff enter the courier fee (owner, admin)                                  | **BLOCKED** | **BLOCKED** | needs owner login                                                                                                   |
| Shop: buyer pays through the simulator                                            | not run     | not run     | follows the quote                                                                                                   |
| Shop: store moves it to delivered; tracking shows each step                       | **BLOCKED** | **BLOCKED** | needs a store-user login (`E2E_STORE_A_*`, the store nearest the pin)                                               |
| AI chat, gallery item 746 (opens, plain answer, WhatsApp handoff with the item)   | pass        | not run     | 1 session a run                                                                                                     |
| AI chat, shop product (same)                                                      | pass        | not run     | 1 session a run                                                                                                     |

Chat runs at 390 px only: one session per site per run keeps the rehearsal inside 6 sessions per IP per hour (4 spent: runs 1 and 2).
Handoff proof (run 2, shop): the assistant replied "Done. A WhatsApp button for the Balinese Legong Dancer, 1925 print is now
showing, with the item and a short summary" and a "Continue on WhatsApp" link whose `text` names the item
(`shots/chat-shop-3-handoff-390.png`); gallery likewise (`chat-gallery-3-handoff-390.png`). The assertion is that some `wa.me` link
in the dialog carries text matching the item.

The staff steps (quote, pay, fulfil, track) are written (`shop.spec.ts`) in the 7.4 gate's own way
(`tests/e2e/shop-fulfilment/flow.spec.ts`) but have **never been executed here: treat them as unverified**.

## Runs

| Run | Result                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 13 passed, 5 failed (4 BLOCKED, 1 test defect: the shop chat step read the handoff before the reply finished; fixed to wait for the Send button to return from Stop), 4 did not run |
| 2   | 14 passed, 4 BLOCKED, 4 did not run (chat gallery and shop pass)                                                                                                                    |
| 3   | 12 passed, 4 BLOCKED, 4 did not run (chat left out: session budget)                                                                                                                 |
| 4   | 12 passed, 4 BLOCKED, 4 did not run (chat left out; final spec; order number now read off the page)                                                                                 |

Runs 2 and 4 (identical but for chat) are the pair on the final code. Between 3 and 4 two attempts of the shop spec hung on a wrong
locator for the order number on the awaiting-quote page (orders placed, then the test timed out); fixed to read the text "Order N".

## Created on staging (all marked REHEARSAL 10.3; please close or delete)

- **Leads** (kind contact, site gallery, name "REHEARSAL 10.3", emails `rehearsal-10-3.gallery.<width>.<run>@example.test`): 9, one per
  gallery lead test: an aborted first attempt (run tag `20261008154912`, 390), then runs `run1`, `run2`, `run3`, `run4`, each at 390 and 1280.
  **Lead ids were not read**: that needs the owner login (blocked); find them by email.
- **Orders** (shop, buyer "REHEARSAL 10.3", emails `rehearsal-10-3.shop.<width>.<run>@example.test`, all `awaiting_quote`, one Rp 450.000 print each):
  100019 (run1 390), 100020 (run1 1280), 100021 (run2 390), 100022 (run2 1280), 100023 (run3 390), 100024 (run3 1280), 100028 (run4 390),
  100029 (run4 1280); plus 100025 to 100027 from the two hung attempts and a worker that was killed (not recorded in the ledger; one of the three may not exist).
  None was quoted or paid. The unquoted hold lets stock go back on expiry (2 h), but the rows should be cleared.
- Chat: 4 sessions (2 per site).

## Findings

1. **Blocker for the full journey: staging staff credentials.** To finish 10.3.b run with `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`,
   `E2E_STORE_A_EMAIL`, `E2E_STORE_A_PASSWORD` (a user of the store nearest Denpasar, DPS-004 in the 7.x gate) in the environment
   (and, optionally, nothing else: Mailpit is no longer needed). Then the lead lookup and the four shop staff/buyer steps run.
2. **Staging contact channels are placeholders**: the gallery's "Ask about this", footer and chat handoff use `wa.me/6281100000000` and
   `gallery@example.com` (the shop footer the same number). The journey passes because the link is well formed and carries the item; before
   launch the owner must enter the real WhatsApp number and email (OA2). Leads sent from the form go to whatever notify address is set.
3. Not a defect: the awaiting-quote page now shows "Order N" (it did not in 7.4), so the order can be found in the admin without Mailpit.
4. LLM replies vary; the chat assertions check a reply exists and that a handoff link names the item, not any wording.
