# Chat panel gate (8.2.c)

**Verdict: MET on staging**, release `production-20261008T050833Z-7c172df5` (main `7c172df5`), 2026-10-08, the
chat on GLM 5.3 Flash (Q7). Walked by `tests/e2e/chat/walk-82c.mjs` (Playwright, one chat session per site,
7 chat turns in all), from an item page on each site at **390 px**, then the same session at **1280 px**.

| Clause                                                     | Gallery (`/product/746`, P.1180)                                                                                         | Shop (`/product/balinese-legong-dancer-1925`)                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Opened from the floating button by keyboard (focus, Enter) | yes                                                                                                                      | yes                                                                                                                                 |
| The chat knows the item                                    | "karya ini, "Abhimanjoe, Wayang Figure Java" (… nomor stok P.1180)"                                                      | "ada dua pilihan untuk "Balinese Legong Dancer, 1925": Mounted print … Framed print …"                                              |
| Answers a bilingual question                               | asked in Indonesian, answered in Indonesian                                                                              | asked in Indonesian, answered in Indonesian                                                                                         |
| Offers the WhatsApp handoff with the item in the text      | `wa.me` text: "… The item(s): - Abhimanjoe, Wayang Figure Java (P.1180) https://indies-gallery.gaiada.com/product/746-…" | `wa.me` text: "… - Balinese Legong Dancer, 1925 (SEED-IG02) https://old-east-indies.gaiada.com/product/balinese-legong-dancer-1925" |
| The lead form appears only on request                      | 0 before asking, 1 after "Please have someone from the team contact me."                                                 | 0 before, 1 after                                                                                                                   |
| Screen reader                                              | the panel is `role="dialog"` named "Chat with us"; the thread is `role="log"`, `aria-live="polite"`                      | same                                                                                                                                |
| Keyboard                                                   | Escape closes; focus returns to "Chat with us"                                                                           | same                                                                                                                                |
| axe, whole page, chat open, after the replies              | 390 px: none · 1280 px: none                                                                                             | 390 px: none · 1280 px: none                                                                                                        |

Screenshots: `docs/gates/chat/walk-gallery-390.png`, `walk-gallery-1280.png`, `walk-shop-390.png`.

## What changed in 8.2 on the way (2026-10-08)

- **Floating chat** (the user): a "Chat with us" button at the bottom right of every page instead of a header item;
  open, the panel is fixed to the viewport: a full-height sheet on a phone, a 420×640 side panel from 768 px. On a
  phone it rises above the shop's sticky add-to-cart row. A session that cannot start shows the server's own words.
- **Customer-service redesign** (the user): agent header (avatar, name, "AI assistant · replies instantly") with a
  fixed **Talk to a person**; a greeting that names the page's item; suggestion chips that send on tap; bubbles; a
  typing indicator; one rounded composer (Enter sends); soft error notices with the contact buttons; chat tokens.
- The assistant's **bold, paragraphs and lists** render (AI.md §2.2's subset); HTML stays text.
- Found by the first walk and fixed: the panel opened inside the phone's "Main menu" dialog with no name of its own;
  focus was not returned on close; the phone drawer wrapped the nav in a second, unnamed `<nav>` (axe
  `landmark-unique`).
- Staging's gallery had no WhatsApp or email in `site-settings`: placeholders (the shop's staging WhatsApp number,
  `gallery@example.com`) until the owner's contacts (OA2). Staging only.

## Follow-ups (not blocking)

- An English question right after Indonesian ones got a reply that opens in English and continues in Indonesian;
  the prompt says to follow the visitor's language per message.
- The first reply in each walk session was not captured by the walk's 25 s wait (session start plus Turnstile plus
  the first turn); the next replies were. Raise the first wait if the walk is reused.
- The server-built handoff for a general ask read "a question about a general question"; fixed in `a56cd697`
  ("your items"), live with the next release.
- A seeded work without a slug links as `/product/746-item`; it answers one 308 to the real address.
- Admin at 390 px: Payload's navigation drawer squeezes the document column (seen beside the 8.3 button).
- A visitor IP may start 6 chat sessions an hour; an office shares one IP (see `docs/gates/ai.md`, Open).
