# Voice — the gallery storefront (Indies Gallery)

Task 6.3.a (TASKS.md, phase 6). How the gallery speaks, in English and Indonesian: its
principles, its register, its stance, and the words it has settled on. The words
themselves live in the brand folder, as the values of the app's message keys
(BRANDS.md §2: apps own keys; brands own words):

- **keys and neutral defaults:** `engine/apps/gallery/src/messages/keys.ts`, composing one
  module per area in `messages/lexicon/`
- **the gallery's values:** `indies-gallery/site/copy/en.json`, `id.json`

**Status.** English: drafted from the briefs, for the owner's review with the owner
interview (OA2). Indonesian: **drafted, awaiting native review** — no native
Indonesian writer has reviewed it yet (TASKS.md 6.3.c, 👤 OA4, D20). Every
Indonesian line below and in `id.json` is a proposal until that review. Where an
answer from the owner interview would change a word, the line names the question
(G1–G15, `docs/design/journeys/owner-interview.md`) and the copy keeps its
placeholder until then.

---

## 1. Who we are talking to

Collectors who read Latin and Dutch titles and want collation before price;
institutions whose finance office has never heard of us; designers presenting to a
client; heritage buyers looking for the town their family knew (PRODUCT.md › Users).
Most arrive from Google onto one item page, on a phone — the research's expectation,
open until G3 and G12. They are expert, busy and wary of dealers who oversell. The
voice earns trust by being exact.

## 2. The register

**English.** A good dealer's letter: courteous, plain and exact. Full sentences in
running text, short noun phrases on controls. British spelling, matching the
project's documents and the Singapore market (*colour*, *catalogue*,
*centimetres*) — **proposed**, for the owner to confirm (no G-question asks it). Sentence case
everywhere (NOW! DESIGN-SYSTEM.md §6).

**Indonesian — *Anda* (decided, TASKS.md 6.3.d).** Formal and warm, never stiff:
*bahasa baku* as a well-run Jakarta gallery writes it, not officialese and not
chat. *Anda* is capitalised. No *kamu*, no *kak*, no slang, no *Bapak/Ibu* on the
page. Keep the collector's established terms where Indonesian collectors use them
(*proforma*, *passe-partout*, *giclée*); prefer an Indonesian word where one is
current (*cetakan*, *peta kuno*, *ukiran tembaga*). Dates, times and numbers come
from the formatters (`@engine/i18n`), so the copy never writes a date or a number
itself.

## 3. Principles

Each principle has a do and a don't, in both languages. The examples are
illustrations of the rule; any fact in them is a placeholder, never a claim.

### 3.1 The record speaks first

Collation before persuasion (PRODUCT.md › Product Principles 2). State what the
object is before saying anything about it.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Copper engraving, hand-coloured. Sheet 48 × 60 cm (18.9 × 23.6 in)." | "Ukiran tembaga, diwarnai tangan. Lembar 48 × 60 cm (18,9 × 23,6 in)." |
| Don't | "A stunning, rare treasure for the discerning collector!" | "Harta langka yang memukau untuk kolektor sejati!" |

### 3.2 Say exactly how sure we are

Never imply certainty the record lacks (Product Principle 4; DESIGN-SYSTEM.md §10).
Dates carry their precision, attributions their certainty, and the copy never
upgrades either.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Attributed to François Valentijn · c. 1726" | "Diatribusikan kepada François Valentijn · sekitar 1726" |
| Don't | "By Valentijn, 1726" (when the record says *attributed*, *circa*) | "Karya Valentijn, 1726" |

### 3.3 Status is a fact, never pressure

Honest status: "Sold", "On hold until…", "Price on request" — never invented urgency
(PRODUCT.md › Brand Commitments; DESIGN-SYSTEM.md §10). A countdown only where a real
deadline exists, and always with what happens when it ends.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "On hold until {date}. If it is released, it becomes available again." | "Ditahan hingga {date}. Jika dilepas, karya ini tersedia kembali." |
| Don't | "Hurry — 3 collectors are looking at this map!" | "Cepat — 3 kolektor sedang melihat peta ini!" |

### 3.4 Explain and instruct; do not apologise

An error or a refusal says what happened and what the buyer can do next, in one or
two sentences (design.md › Error Handling; NOW! DESIGN-SYSTEM.md §6).

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "This work can be delivered within Indonesia only. View it in {place}, or ask us about it." | "Karya ini hanya dapat dikirim di dalam Indonesia. Lihat langsung di {place}, atau tanyakan kepada kami." |
| Don't | "Oops! Sorry, something went wrong :(" | "Ups! Maaf, terjadi kesalahan :(" |

### 3.5 A conversation is a conversion

Request price, offer, hold and viewing are first-class (Product Principle 5). An
invitation to talk is written with the same confidence as "Buy now" — never as a
consolation, never as a lock to be opened.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Request price" · "Book a viewing" | "Tanyakan harga" · "Jadwalkan kunjungan" |
| Don't | "Price hidden — contact us to unlock" | "Harga disembunyikan — hubungi kami untuk membukanya" |

### 3.6 A control names its outcome

Buttons say what happens, in the buyer's words; the confirmation repeats it
(NOW! DESIGN-SYSTEM.md §6). No "Submit", no "Click here".

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Send offer" → "Your offer has reached us. We will reply by email." | "Kirim penawaran" → "Penawaran Anda sudah kami terima. Kami akan membalas lewat email." |
| Don't | "Submit" → "Success!" | "Kirim" → "Berhasil!" |

### 3.7 Both names: the record's and today's

The heritage buyer searches under the name her family used (J-G4). A place is named
as the record names it, with today's name beside it; the copy never corrects the
record and never drops the modern name.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Buitenzorg (Bogor)" · "Did you mean Buitenzorg (Bogor)?" | "Buitenzorg (Bogor)" · "Maksud Anda Buitenzorg (Bogor)?" |
| Don't | "Bogor" alone on a map titled *Buitenzorg* | "Bogor" saja pada peta berjudul *Buitenzorg* |

### 3.8 Only facts the data holds

No number, date, promise or name appears in copy unless the data or the brand config
supplies it: years in trade (G13), reply times (G9), hold lengths (G5), guarantees
and returns (G6, D11), named institutions (G10), what the certificate covers (G7).
The copy carries a `{placeholder}` and the page fills it — or the line is not shown.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "We reply within {hours} hours." (shown only when the config has a figure) | "Kami membalas dalam {hours} jam." |
| Don't | "We reply within two working days." (the design draft's line, unconfirmed) | "Kami membalas dalam dua hari kerja." |

## 4. The colonial archive and the VOC

**The gallery's brief states no stance on the VOC or the colonial archive**
(`engine/apps/gallery/PRODUCT.md`; the stance in EXPERIENCE-SHOP.md and the shop's
PRODUCT.md is the shop's own). This file therefore sets none. What already applies
is §3.1–3.2 and §3.7: where the record names the VOC — a publisher, a subject term
(CONTENT-MODEL.md §2), the "VOC era 1602–1799" date chip (EXPERIENCE-GALLERY.md
§4) — the copy states it as the record does, and names places as the record and
today both name them.

Whether the gallery wants a written position of its own is a question for the owner;
it is not among G1–G15, so it is proposed as a follow-up to the interview (6.1.f).

## 5. Placeholders, plurals and prefilled messages

- **Placeholders** are `{name}`: the app fills them; a value must carry exactly the
  default's placeholders (`checkCopy()`, `@engine/i18n/copy`). A date, a price, a
  time zone or a count is always a placeholder, never typed into copy.
- **Plurals** are `key.one` / `key.other` in English; Indonesian has `other` alone,
  and never pluralises by repetition in a count ("3 karya", not "3 karya-karya").
- **Prefilled WhatsApp messages** are written in the buyer's voice, to the gallery,
  in the page's language (EXPERIENCE-SHOP.md §8; J-G1 step 5), and always carry
  the stock number and the title (Requirement 6.7). They are drafts the buyer
  edits, so they are short and plain. In Indonesian the buyer writes *saya*.

## 6. The settled words

The lexicon's core terms, one choice each, so a word means one thing everywhere.

| Concept | English | Indonesian | Key |
| ------- | ------- | ---------- | --- |
| the object | work | karya | — |
| free to buy | Available | Tersedia | `status.available` |
| held for someone else | On hold until {date} | Ditahan hingga {date} | `status.onHoldUntil` |
| held for this buyer | Held for you until {date} | Ditahan untuk Anda hingga {date} | `status.heldForMe.*` |
| sold | Sold | Terjual | `status.sold` |
| no public price | Price on request | Harga atas permintaan | `price.onRequest` |
| sells only by conversation (enquiry-only) | Available on enquiry | Tersedia dengan menghubungi kami | `status.enquiryOnly.*` |
| cannot leave the country (domestic-only) | Available for delivery within {country} · View it in {place} | Tersedia untuk pengiriman di dalam {country} · Lihat langsung di {place} | `status.domesticOnly` |
| unique | One of one | Satu-satunya | `status.oneOfOne` |
| not an original | Reproduction | Reproduksi | `label.reproduction` |
| a hold (noun) · to hold | a hold · to hold | penahanan · menahan | `hold.*` |
| an offer · a counter | an offer · a counter | penawaran · harga balasan | `offer.*` |
| to accept (an offer, a proforma) | Accept | Setujui | `offer.accept`, `quote.accept` |
| received (a message, an offer) | received | sudah kami terima | `form.received`, `offer.received` |
| a viewing | a viewing | kunjungan | `viewing.*`, `action.viewing` |
| proforma invoice | proforma invoice | faktur proforma | `document.proforma` |
| the cart | cart | keranjang | `cart.*` |
| the stock number | Stock no. | No. stok | `label.stockNumber` |
| an alert (want-list) | alert | pemberitahuan | `wantList.*` |
| saved works | wishlist | daftar keinginan | `wishlist.*` |
| a link | link | tautan | `pay.*` |
| expired | expired | kedaluwarsa | — |
| paid | Paid | Lunas | `order.status.paid` |

**Two traps in Indonesian.** *Diterima* means both "received" and "accepted", so an offer
that has arrived is *sudah kami terima* and one that is accepted is *disetujui* — never
*diterima* for acceptance. And *terkirim* reads as "sent", so a parcel that has arrived
is *telah sampai*.

## 7. What the lexicon covers

The keys live in `engine/apps/gallery/src/messages/keys.ts`, composed from one module per
area in `messages/lexicon/`; the values in `indies-gallery/site/copy/{en,id}.json`.

| TASKS.md 6.3.d asks for | Where |
| ----------------------- | ----- |
| every status — available, on hold until, reserved (held for you), sold, price on request, enquiry-only, domestic-only, export pending, checking, unverified | `status.*`, `price.*`, `order.status.*`, `shipment.*`, `offer.status.*`, `hold.status.*`, `viewing.status.*`, `quote.status.*`, `wantList.status.*` |
| every purchase mode (C1 `PURCHASE_ACTIONS`) | `action.*` |
| configurator labels | the shop's (`configurator.*`, in the emporium app): no gallery journey or EXPERIENCE-GALLERY.md surface names a configurator |
| every checkout step | `checkout.step.*`, the step fields `checkout.*`, `shipping.*`, `totals.*`, `payment.family.*` |
| every error | `problem.*`, `notice.*`, `codeInvalid.*`, `payment.unavailable.*`, `payment.failed.*`, `checkout.problem.*`, `field.*`, `form.*`, `signIn.*`, `error.*`, `gone.*` |
| every empty state | `empty.*`, `cart.empty`, `wishlist.empty` |
| every prefilled WhatsApp message | `whatsapp.*` |
| the image labels (retouching-and-labelling.md §4–§6) | `image.synthetic.<label>` and `image.syntheticAlt.<label>` by C9 `SYNTHETIC_LABEL`; the filmstrip's `image.role.<role>` (C9 `WORK_IMAGE_ROLES`, `LOCATION_IMAGE_ROLES`); the mat caption is `image.inMat` |
| the loaders' notes (C2 `MessageVM` codes) | `message.<code>` — every code the C2 fixtures use that the gallery renders, the consignment's next steps and the delivery promise's `holidayDelay` included |
| the converted estimate (D47) | `price.converted` ("≈ {estimate} — charged in {price}") and its note `price.convertedNote` |

**The contracts' value lists (6.3.f).** Each key spells the contract's own code, so a
component looks its label up by the value it holds:

| List | Contract | Keys |
| ---- | -------- | ---- |
| facet names | C1 `FACET_KEYS` (all of them: which a listing shows follows from its modules and data) | `facet.<key>`, `facet.price.includeOnRequest` |
| sort orders | C1 `SORT_KEYS` | `sort.<key>` |
| object types | C1 `OBJECT_TYPES` | `objectType.<type>` |
| maker roles and certainty | C2 `MakerRole`, `Certainty` | `maker.role.<role>`, `maker.certainty.<certainty>` (carries `{name}`) |
| the record | C2 `RecordVM`, `DimensionsVM`, `ConditionVM`, `BookPartVM` | `record.*` |
| account sections | C10 `ACCOUNT_SECTIONS`, as the buyer's nav shows them | `account.section.<section>` |
| what waits on the buyer | C2 `AttentionVM.kind` | `account.attention.<kind>` |
| enquiry topics | C6 `EnquiryTopic` | `enquiry.topic`, `enquiry.topic.<topic>` |
| returns | C6 `ReturnReason`, `ReturnRequestView.status` | `return.reason.<reason>`, `return.status.<status>` |
| a consignment's timeline | C6 `ConsignmentStatus` | `consignment.status.<status>` |

A return's reason and status are labels, not a promise: the gallery's returns policy waits
on G6 (§8) and no line here states one.

**Channels (D14).** Until a WhatsApp provider is chosen, no copy promises a WhatsApp
message: order updates go by email, and the `message.whatsappWhenPaid` note says "we will
let you know", not "we will WhatsApp you". Click-to-chat (`whatsapp.*`) works regardless.

## 8. Open until the owner answers

No line pre-empts an owner answer; each waits as a placeholder or is not written.

| Question | What waits | Until then |
| -------- | ---------- | ---------- |
| G1 name | every `{brand}` and `{sister}` | the brand config's name |
| G4 where "on request" begins | when `price.onRequest` shows | data |
| G5 hold length | `action.reserve` names no hours; `checkout.proformaHoldsOnApproval` / `…Now` | D45's default: staff approve first |
| G6 guarantee and returns | nothing is written | the reassurance row stays empty (D11) |
| G7 the certificate | only the document's name, `document.certificate` | no claim of coverage |
| G9 reply time | `message.replyWithin*`, `price.queued`, `message.holdReplyWithinHours` carry `{hours}` / `{days}` | shown only when the config holds a figure |
| G10 institutions | nothing is written | — |
| G11 shipping and insurance | `shipping.coverFineArt` shows only when the rate says so | quote-required (`shipping.quoteRequired`) |
| G13 facts about the gallery | `message.notAllOnline` carries `{held}` | the figure is data |
| G14 factsheet price | `action.factsheet` names no price | — |

Whether the gallery wants a stated position on the VOC and the colonial archive (§4) is a
new question, proposed for the interview.

## 9. For the native review (OA4)

Awaiting review; no line in `id.json` has been reviewed by a native writer. The
questions this draft most needs answered:

1. Is *Anda* with *bahasa baku* right for this gallery's buyers, or does it read stiff next
   to Jakarta galleries' own sites?
2. *Harga atas permintaan* for "Price on request" — or *Harga berdasarkan permintaan*, or
   *Hubungi kami untuk harga*?
3. "On hold": *Ditahan hingga {date}* — or *Dipesan hingga*, *Direservasi hingga*?
4. "Reserve" as a button: *Minta ditahan* — natural, or would a collector expect
   *Reservasi*?
5. "Available on enquiry": *Tersedia dengan menghubungi kami* is long. Better?
6. "Book a viewing": *Jadwalkan kunjungan* — or does *kunjungan* lose that the buyer comes
   to see particular works (*janji melihat karya*)?
7. *Penawaran* serves "an offer"; the counter is *harga balasan*. Clear to a buyer?
8. *Setujui* for accepting an offer and a proforma, to avoid *diterima*'s double meaning —
   right, or does *terima* read more natural in a button?
9. Is *faktur proforma* the term Indonesian finance offices use, or *invoice proforma*?
10. *Passe-partout* for a mat — or *mat*, or *bingkai dalam*?
11. *Lembar informasi* for "factsheet" — or *lembar data*, *factsheet*?
12. *Daftar keinginan* for "wishlist" — or *wishlist*, as many Indonesian shops keep it?
13. The prefilled WhatsApp messages open "Halo, saya tertarik dengan…" — the way a
    collector writes to a gallery, or too plain (*Selamat siang*)?
14. Loanwords kept as they are: *browser*, *email*, *virtual account*, *PDF*. Any to
    translate (*peramban*, *surel*)?
15. The maker line's certainty: *Diatribusikan kepada {name}* for "Attributed to",
    *Berdasarkan karya {name}* for "After", *Bengkel kerja {name}* for "Workshop of" — the
    terms Indonesian catalogues use?
16. The record's printmaking terms: *Keadaan pelat (state)*, *Tahun pada pelat* ("date on
    plate"), *Lembar pelat* (a book's plates), *Provenans*, *Cahaya samping* / *Cahaya
    tembus* (raking and transmitted light) — current, or kept in English as collectors say
    them?
17. *Recto (sisi depan)* and *Verso (sisi belakang)*: keep the Latin with a gloss, or the
    Indonesian alone?
18. *Penahanan* for the account's "Holds" and *Jual kepada kami* for its consignments — natural
    as navigation, or too formal?
