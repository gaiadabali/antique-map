# Voice — the emporium storefront (Old East Indies)

Task 6.3.a (TASKS.md, phase 6). How the shop speaks, in English and Indonesian: its
principles, its register, its stance, and the words it has settled on. The words
themselves live in the brand folder, as the values of the app's message keys
(BRANDS.md §2: apps own keys; brands own words):

- **keys and neutral defaults:** `engine/apps/emporium/src/messages/keys.ts`, composing one
  module per area in `messages/lexicon/`
- **the shop's values:** `old-east-indies/site/copy/en.json`, `id.json`

**Status.** English: drafted from the briefs; British spelling confirmed by the owner
(2026-10-01). Indonesian: **drafted, awaiting native review** — no native Indonesian
writer has reviewed it yet (TASKS.md 6.3.c, 👤 OA4, D20). The Indonesian register is
**decided: *Anda*** (the owner's answer to S15, 1 October 2026,
`docs/design/journeys/owner-answers.md`; TASKS.md Decisions › Voice); every `id.json`
value is in it since 6.3.g. Where an answer from the owner interview would change a word,
the line names the question (S1–S15, `docs/design/journeys/owner-interview.md`) and the
copy keeps its placeholder until then.

---

## 1. Who we are talking to

Tourists in Bali and Jakarta, expats furnishing a home, the Indonesian diaspora and
the Dutch-Indisch community, gift buyers for oleh-oleh, Lebaran, Imlek, Christmas and
Sinterklaas — shopping as guests, mostly from Instagram on a phone (PRODUCT.md ›
Users), with showroom walk-ins the main buyers today (S9). And business buyers — shops,
hotels, villas, cafés, companies — who all come through the one Partnership programme
(D31, D36). They want something with meaning that is easy to buy, easy to carry and
certain to arrive.

## 2. The register

**English.** A friendly shopkeeper who knows the archive: warm, short, spoken, and
exact about money and delivery. "Warmer and more playful than the gallery; the same
family" (PRODUCT.md › Positioning). Playful in stories and headings, never in a
price, a label or an error. **British spelling** (*colour*, *catalogue*, *centimetres*,
*organisation*), as the gallery — confirmed by the owner, 1 October 2026
(`owner-answers.md` › Also answered). Sentence case everywhere (NOW! DESIGN-SYSTEM.md §6).

**Indonesian — *Anda* (decided: the owner's answer to S15, 2026-10-01).**

The owner chose *Anda* over the interview's default *kamu*, and kept the stance:
celebrate the maps and the islands, no VOC imagery (§4). So the whole shop — the
storefront, the bag and checkout, the Partnership, a partner's account and quotes — speaks
one register; the Partnership exception the *kamu* draft carried is gone.

*Anda* can still be friendly. The warmth that *kamu* carried moves into everything else:
short sentences, spoken words, the shop talking as *kami*, a light *ya* where a person
would say it ("Tanya kami, ya."), and the buyer's own loanwords. It is *Anda* the way a
good Bali shop's staff say it across the counter — polite, quick and warm — not the
*Anda* of a form from the tax office.

**How the shop's *Anda* differs from the gallery's** (`docs/design/gallery/voice.md` §2):

| | The gallery | The shop |
| - | ----------- | -------- |
| tone | *bahasa baku*, a well-run Jakarta gallery's letter: courteous, formal, exact | everyday polite Indonesian, spoken: warm, short, a little playful in headings and empty states |
| sentences | full sentences, formal connectives (*agar*, *apabila*, *telah*) | short, spoken connectives (*supaya*, *kalau*, *sudah*, *begitu*) |
| particles and colloquial words | none | sparingly: *ya*, *lagi*, *cek*, *nanti*, *ongkir*, *chat* — never in a price, a total or a payment step |
| loanwords | the collector's (*proforma*, *passe-partout*, *giclée*), else Indonesian (*tautan*, *pemberitahuan*, *kedaluwarsa*) | the buyer's (*link*, *voucher*, *e-wallet*, *QRIS*, *showroom*, *chat*) where they are what people say |
| the buyer, in the buyer's own words | *saya* | *saya* |
| an alert, a link | *pemberitahuan*, *tautan* | *kabar*, *link* |

Rules for both: *Anda* is capitalised; never *kamu*, *aku*, *-mu* or *-ku*; no *lo/gue*,
no *kak* on the page (it may appear in staff's own WhatsApp replies — that is theirs); no
*Bapak/Ibu* on the page. No English where an Indonesian word is current, but the buyer's
own loanwords stay (*checkout* → *pembayaran*, but *voucher*, *e-wallet*, *QRIS*). The
shop's "bag" is *keranjang* in Indonesian — the word every Indonesian shop uses — not
*tas*, which would read as a handbag. The Partnership and a partner's pages are the most
businesslike corner of the shop: *Anda* without *ya* or *lagi*, as a supplier writes to a
hotel's purchasing manager.

## 3. Principles

Each principle has a do and a don't, in both languages. The examples are
illustrations of the rule; any fact in them is a placeholder, never a claim.

### 3.1 Story first, then product

Every item is a way into the archive (Product Principle 1). Say where the image
comes from before what it is printed on.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "From an engraving in the archive, Archive No. {archiveNo} — now a giclée print." | "Dari sebuah ukiran di arsip, Archive No. {archiveNo} — kini jadi cetakan giclée." |
| Don't | "Premium wall art poster, high quality print, best seller!" | "Poster dinding premium, kualitas tinggi, paling laris!" |

### 3.2 Celebrate the archipelago, never the VOC

See §4. The islands, the maps and the craft of printmaking are the subject; the
company that commissioned some of the maps is not a hero.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "The Spice Islands, as an engraver drew them" | "Kepulauan Rempah, seperti digambar seorang pengukir" |
| Don't | "Bring home the glamour of the Dutch East Indies" | "Bawa pulang kemewahan zaman Hindia Belanda" |

### 3.3 Honest labels, always

Every product says **Reproduction** and shows its Archive No. (Requirement 7.1;
DESIGN-SYSTEM.md §10). "Made to order", a making time or a delivery date appears only
when the data says so (Product Principle 4; S7).

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Reproduction · Archive No. {archiveNo}" · "Made to order" | "Reproduksi · Archive No. {archiveNo}" · "Dibuat sesuai pesanan" |
| Don't | "Original vintage poster" · "Ships tomorrow!" (with no data behind it) | "Poster vintage asli" · "Besok langsung dikirim!" |

### 3.4 Warm, never cute at the cost of clear

A little play in a heading or an empty state; none in a price, a total, a payment
step or an error. No emoji in the interface.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Your bag is empty — the archive isn't." | "Keranjang Anda masih kosong — arsipnya tidak." |
| Don't | "Yay!! 🎉 Great choice bestie!" | "Yeay!! 🎉 Pilihannya keren banget, bestie!" |

### 3.5 Money and delivery are exact

The price, the currency charged, the duties and the delivery estimate are stated
before payment, in full (J-S2, J-S5). The copy never rounds, never says "about" of a
charge, and names who pays duties.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Charged in {currency}. Import duties are paid by the recipient on arrival." | "Ditagih dalam {currency}. Bea masuk dibayar penerima saat barang tiba." |
| Don't | "Shipping calculated later" · "Duties may apply" | "Ongkir dihitung nanti" · "Mungkin ada bea masuk" |

### 3.6 Explain and instruct; never blame

An error says what happened and what to do, in one or two sentences (design.md ›
Error Handling; NOW! DESIGN-SYSTEM.md §6).

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Glass is only for pickup or delivery within Bali — choose acrylic to send it further" | "Kaca hanya untuk ambil sendiri atau pengiriman di Bali — pilih akrilik untuk dikirim lebih jauh" |
| Don't | "Invalid option." · "You selected the wrong glazing." | "Opsi tidak valid." · "Anda salah memilih kaca." |

### 3.7 No invented urgency, no invented offers

No resetting countdowns, no "only 2 left" unless stock says so, no free-shipping line
or welcome discount the owner has not set (DESIGN-SYSTEM.md §10; S13).

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "{amount} more for free delivery" (only when a threshold is set) | "{amount} lagi untuk gratis ongkir" |
| Don't | "Sale ends in 00:14:59!" | "Promo berakhir dalam 00:14:59!" |

### 3.8 WhatsApp is always one tap away

"Ask on WhatsApp" sits on every product, with the product and the chosen options
prefilled in the page's language (EXPERIENCE-SHOP.md §8). The prefilled message is
the buyer's draft, in the buyer's voice: short, plain, easy to edit.

| | English | Indonesian |
| - | ------- | ---------- |
| Do | "Hi! I have a question about {title} ({archiveNo}): {options}. {url}" | "Halo! Saya mau tanya soal {title} ({archiveNo}): {options}. {url}" |
| Don't | "Hello, I am interested in your product. Please contact me ASAP." | "Halo, saya tertarik dengan produk Anda. Mohon segera hubungi saya." |

## 4. The colonial archive and the VOC

The shop's stance is stated in its brief and in EXPERIENCE-SHOP.md, and this file
applies it as written: **celebrate cartography and the archipelago — not the VOC; no
VOC logo, no colonial nostalgia as a voice** (`engine/apps/emporium/PRODUCT.md` ›
Brand Commitments; EXPERIENCE-SHOP.md, "Two cautions"). The chosen visual world
celebrates the archipelago and the craft of printmaking and avoids the colonial gaze
(EXPERIENCE-SHOP.md intro).

For copy, that means: the subject of a line is the islands, the map, the maker's
craft or the buyer's home — never the Company, its trade or its "golden age"; "VOC"
appears only as a fact of the record (a publisher, a date, a subject), never as a
selling point; no *tempo doeloe* sentiment, no "exotic", no "the Orient".

**The owner's answer (S15, 2026-10-01): "no VOC imagery".** It confirms this section
and adds nothing to unwind: no VOC monogram, ship or Company emblem as decoration, a
pattern, packaging or a heading's ornament — the VOC appears on the shop only where an
item itself shows it (a map's cartouche, a print's subject), and then the copy names it
as the record does. The gallery now takes the same stance (its voice.md §4), so the
sisters say one thing about the colonial archive.

## 5. Placeholders, plurals and prefilled messages

- **Placeholders** are `{name}`: the app fills them; a value must carry exactly the
  default's placeholders (`checkCopy()`, `@engine/i18n/copy`). A price, a date, a
  day count, reply hours or a threshold is always a placeholder, never typed into
  copy (S2, S6, S7, S13).
- **Plurals** are `key.one` / `key.other` in English; Indonesian has `other` alone.
- **Prefilled WhatsApp messages** carry the product title, the Archive No., the
  chosen options and the link that restores them (J-S1 step 5). In Indonesian the
  buyer writes *saya* to the shop (the buyer's register is their own; *saya* is safe
  with any shop).

## 6. The settled words

The lexicon's core terms, one choice each, so a word means one thing everywhere.

| Concept | English | Indonesian | Key |
| ------- | ------- | ---------- | --- |
| not an original — on every product | Reproduction | Reproduksi | `label.reproduction` |
| the archive reference | Archive No. {archiveNo} | No. Arsip {archiveNo} | `label.archiveNo` |
| made after the order | Made to order | Dibuat sesuai pesanan | `label.madeToOrder`, `message.madeToOrder` |
| in the showroom | In the showroom now | Ada di showroom sekarang | `stock.inShowroom` |
| none left | Sold out | Habis | `stock.soldOut` |
| the bag | bag | keranjang | `cart.*`, `action.addToBag` |
| shipping cost | shipping | ongkir (ongkos kirim in full) | `totals.shipping` |
| pick up | pick up | ambil | `checkout.pickup`, `showroom.*` |
| discount code | voucher | voucher | `cart.codeLabel` |
| saved items (on the device) | Saved | Tersimpan | `wishlist.*` |
| an alert | alert | kabar | `wantList.*` |
| a link | link | link | `pay.*` |
| the configurator's axes | Format · Size · Paper · Frame · Mount · Glazing | Format · Ukuran · Kertas · Bingkai · Passe-partout · Kaca/akrilik pelindung | `configurator.axis.*` |
| the three previews | Flat · On a wall · To scale | Datar · Di dinding · Sesuai skala | `configurator.view.*` |
| gift options | Gift note · Gift wrap · Hide prices | Kartu ucapan · Bungkus kado · Sembunyikan harga | `gift.*` |
| gift card | gift card | kartu hadiah | `giftCard.*` |
| the business programme | Partnership · partner | Kemitraan · mitra | `partnership.*`, `partner.*` |
| a price for a partner | quote | penawaran harga | `quote.*`, `action.quote` |
| paid | Paid | Lunas | `order.status.paid` |

**First person.** The shop addresses the buyer as *Anda*; whatever the buyer "says" — a
control, a consent, a prefilled WhatsApp message (§5) — is in *saya*, on every surface:
"Kirimi saya…", "Saya setuju…", "Antar ke hotel atau vila saya sebelum saya pulang", "Cari
pesanan saya". Never *aku* or *-ku*.

## 7. What the lexicon covers

The keys live in `engine/apps/emporium/src/messages/keys.ts`, composed from one module per
area in `messages/lexicon/`; the values in `old-east-indies/site/copy/{en,id}.json`.

| TASKS.md 6.3.d asks for | Where |
| ----------------------- | ----- |
| every status — available, in the showroom, low stock, sold out, made to order, on hold, sold, price on request, enquiry-only, domestic-only | `status.*`, `stock.*`, `badge.*`, `label.*`, `price.*`, `order.status.*`, `shipment.*`, `quote.status.*`, `wantList.status.*` |
| every purchase mode | `action.*` (add to bag, ask on WhatsApp, turn into a quote, alert), `showroom.*`, `visiting.*` |
| every configurator label | `configurator.*`, and the reasons `message.glassBaliOnly`, `message.mountNeedsFrame` |
| every checkout step | `checkout.step.*`, the step fields `checkout.*`, `shipping.*`, `totals.*`, `payment.family.*`, `pending.*` |
| every error | `problem.*`, `notice.*`, `codeInvalid.*`, `payment.unavailable.*`, `payment.failed.*`, `checkout.problem.*`, `field.*`, `form.*`, `signIn.*`, `error.*`, `gone.*`, `giftCard.invalid` |
| every empty state | `empty.*`, `cart.empty`, `wishlist.empty`, `wishlist.emptyElsewhere` |
| every prefilled WhatsApp message | `whatsapp.*` |
| the image labels (retouching-and-labelling.md §4–§6, room-scenes.md §8) | `image.synthetic.<label>` and `image.syntheticAlt.<label>` by C9 `SYNTHETIC_LABEL`; `image.role.<role>` (C9 `PRODUCT_IMAGE_ROLES`, `LOCATION_IMAGE_ROLES`); the room plate's caption `configurator.previewCaption`, its `{width}` the plate's `wallWidthCm`, and `configurator.previewCaptionFlat`; the restoration line `label.restored`, filled with the steps `restoration.<step>` (C9 `PRINT_RESTORATIONS`) |
| the loaders' notes (C2 `MessageVM` codes) | `message.<code>` — every code the C2 fixtures use that the shop renders, `holidayDelay` included |
| the converted estimate (D47) | `price.converted` ("≈ {estimate} — charged in {price}", the rupiah total) and its note `price.convertedNote`: the card issuer or PayPal may convert again |

**The contracts' value lists (6.3.f).** Each key spells the contract's own code, so a
component looks its label up by the value it holds:

| List | Contract | Keys |
| ---- | -------- | ---- |
| facet names | C1 `FACET_KEYS` (all of them: which a listing shows follows from its modules and data) | `facet.<key>`, `facet.price.includeOnRequest` |
| sort orders | C1 `SORT_KEYS` | `sort.<key>` |
| object types (the original's) | C1 `OBJECT_TYPES` | `objectType.<type>` |
| maker roles and certainty | C2 `MakerRole`, `Certainty` | `maker.role.<role>`, `maker.certainty.<certainty>` (carries `{name}`) |
| a partner's sections | C10 `ACCOUNT_SECTIONS`, as the partner's nav shows them | `account.section.<section>` — *Anda* |
| the Partnership's shop types | C6 `RETAILER_SHOP_TYPES` | `business.shopType.<type>` — *Anda* |
| enquiry topics | C6 `EnquiryTopic` | `enquiry.topic`, `enquiry.topic.<topic>` |
| returns | C6 `ReturnReason`, `ReturnRequestView.status` | `return.reason.<reason>` (the buyer's own words: *saya*), `return.status.<status>` |

**The lists 6.3.i adds.**

| List | Contract (file:line) | Keys |
| ---- | -------------------- | ---- |
| a place's role | C2 `PlaceRole` (view-models/src/common.ts:201) | `place.role.<role>` |
| the listing's controls | C2 `ListingBase` (view-models/src/surfaces/listing.ts:63–72), `FacetVM` range (:31–36) | `listing.filters`, `listing.sortBy`, `listing.apply`, `listing.clearAll`, `listing.showResults.one/.other` (`{count}`), `listing.min`, `listing.max` |
| the index pages' titles | C2 `DirectorySurface` (view-models/src/surfaces/listing.ts:101) — all of them; the modules decide which show | `directory.<surface>` |
| a curation's kind | C2 `CollectionVM.kind` (view-models/src/surfaces/discovery.ts:81) | `collection.kind.<kind>` |
| the profile's buyer type | C2 `ProfileVM.type` (view-models/src/surfaces/account.ts:54) | `profile.type.<type>` — a partner is `trade`: *Mitra* |
| the analytics consent | C2 `ConsentVM.purpose` (account.ts:61) | `consent.analytics`, beside `consent.marketingEmail` and `consent.marketingWhatsapp` |
| where in the showroom a photograph was taken | C9 `LOCATION_IMAGE_AREAS` (media/src/contract/roles.ts:78) | `image.area.<area>` |

**The form fields (6.3.h).** A C2 field's `name` is its key (form-fields.ts:5–7): the label
is `<name>` (`contact.email`, `business.shopType`, `lines.0.quantity`, `consent.application`),
its hint `<name>Hint` where the app gives one (`contact.whatsappHint`,
`business.taxNumberHint`, `business.messageHint`, `neededByHint`), a fieldset's legend its
`group` (`business`, `contact`, `consent`), and a select's options `<name>.<value>`
(`business.shopType.hotel`). The NPWP's hint is `message.fieldRequiredWhen` ("Required for
businesses in {value}"), `{value}` the region `Intl.DisplayNames` names. The shop's numbers
are Indonesian first, so the WhatsApp hint says a number starting 08 is fine — the server
adds +62 (C6, requests.ts:55).

**Register of these values.** Every Indonesian value is in *Anda* (S15): 6.3.f's were written
in it, and 6.3.g rewrote the 54 that 6.3.b had written in *kamu*, *-mu* or *aku*, each keeping
its meaning and its placeholders.

A return's reason and status are labels, not a promise: damage and returns wait on S12 (§8)
and no line here states a policy.

**Restoration steps** are lower-case fragments that `label.restored` joins into one list
("Digitally restored for print: foxing and stains removed, tears closed"), so each reads
in the middle of a sentence and never alone.

**Channels (D14).** Until a WhatsApp provider is chosen, no copy promises a WhatsApp
message: order updates go by email, and the `message.whatsappWhenPaid` note says "we'll
let you know", not "we'll WhatsApp you". Click-to-chat (`whatsapp.*`) works regardless.

## 8. Open until the owner answers

No line pre-empts an owner answer; each waits as a placeholder or is not written.

| Question | What waits | Until then |
| -------- | ---------- | ---------- |
| S1 range, who makes it | `badge.printed-in-bali`, `label.madeToOrder` show only when the data says so | no claim |
| S2 prices | every `{price}` | data |
| S4 the showroom | `showroom.beforeVisit` is S4's own default; hours are not written | "Message us on WhatsApp before you visit" |
| S6 WhatsApp reply hours | `whatsapp.replyHours` carries `{hours}` | shown only when the config holds them |
| S7 making time | `message.madeToOrder` carries `{min}`–`{max}` | no day count |
| S10 gifts | `gift.*` render only with `commerce.giftWrap` and priced lines | gift note and hidden prices only |
| S12 damage and returns | only `order.reportProblem`; no promise written | — |
| S13 offers | `cart.freeShipping*` render only with a threshold | no free-shipping line |
| ~~S15 register and stance~~ | **answered 2026-10-01: *Anda*, and no VOC imagery** — §2 and §4 follow it; every `id.json` value is in *Anda* (6.3.g) | — |

## 9. For the native review (OA4)

Awaiting review; no line in `id.json` has been reviewed by a native writer. The
questions this draft most needs answered:

1. *Anda* on every page (the owner's S15), with the warmth carried by short spoken
   sentences, *kami*, and a light *ya*: does it read friendly — a good shop across the
   counter — or as formal as the gallery? Where it reads stiff, which lines?
2. The buyer's own controls in *saya* ("Kirimi saya…", "Saya setuju…", "Antar ke hotel
   atau vila saya sebelum saya pulang", "Cari pesanan saya"): natural, or should they avoid
   a pronoun ("Setuju dengan ketentuan penjualan", "Antar sebelum tanggal pulang")?
3. *Keranjang* for the English "bag" — agreed, or is *tas belanja* ever better?
4. *Ongkir* in totals and delivery lines, or *ongkos kirim* in full in the checkout?
5. *Kabar* for an alert ("Dapatkan kabar lewat email") — clear, or *notifikasi*?
6. *Passe-partout* for "mount", and *Kaca/akrilik pelindung* for "glazing": the words a Bali
   framer uses?
7. *Dibuat sesuai pesanan* for "Made to order", or *Pre-order* / *Dibuat setelah dipesan*?
8. *Tersimpan* for the saved list, *Simpan* for the heart — or *Favorit*?
9. "Tanya via WhatsApp", "Chat kami di WhatsApp": natural, or *Hubungi via WhatsApp*?
10. The colloquial touches next to *Anda* (*ya*, *lagi*, *cek*, *nanti*, *chat*; "Tanya kami,
    ya."): the right amount, or do they clash with *Anda* in a shop that is also a heritage
    brand? (6.3.g turned the one *biar* into *supaya*.)
11. The VOC stance in Indonesian copy (§4): any words to avoid beyond *tempo doeloe*,
    *eksotis*, *zaman keemasan*?
12. "Lagi liburan di Bali?" for the visitor's paths, now on an *Anda* site — still warm, or
    should it read "Sedang berlibur di Bali?"; and is it presumptuous for an expat?
13. *Kemitraan* and *mitra* for the Partnership — or keep *Partnership* as a name?
14. The restoration steps (*bintik dan noda dihilangkan*, *lubang ngengat diisi*, *lembar
    atau state digabung jadi satu desain*): clear to a buyer, and is *state* understood?
15. The shop types: *Toko suvenir atau oleh-oleh*, *Toko kado*, *Butik hotel*, *Concept
    store* — the words a Bali business owner would pick from a list?
16. The sort names (*Harga: terendah ke tertinggi*, *Tahun karya asli: tertua ke terbaru*):
    natural in a sort menu, or shorter (*Harga terendah*, *Paling lama*)?
17. *Penerbit kartu Anda atau PayPal dapat mengonversi tagihan ini lagi…* for D47's note —
    clear that the shop's own charge is exact and only a later conversion may differ?
