# Old East Indies — the owner's feedback of 2026-11-19

The owner's notes on the shop's storefront, as received, and how phase 28 (TASKS.md) carries them out.
The shop's pages live once in `@engine/storefront`, so every change shows in both today's app
(`engine/apps/web`) and the shop app (`engine/apps/shop`); every schema change is migrated in both
CMSes (`engine/packages/cms` and `engine/packages/cms-shop`).

## The feedback, as received

**General**

- Have contact details on the top of the page and at the bottom; also include in the drop-down list.
- We will provide a better tagline.
- Shop sections:
  - Best Sellers (e.g. Bali map with all product types appearing)
  - Themes (e.g. Bali, Java, Singapore, Botanicals)
  - Product type (e.g. Mounted Art Prints, Coasters, Notebooks)
  - Wall Decor
- Include a section for "Our Latest Articles"; 2 images that when clicked open a PDF of each article. A
  section that lists all the articles available, each when clicked open a PDF.
- Rename "Partnership" to something else (still thinking of what it should be). It has 2 categories
  "Become a Retailer", "Customised Wholesale Products". Don't need a retailer sign-up.
- Stores: 2 flagship stores and Lombok / Ubud / Amed / Canggu (See all can be reached in a 30 min drive).
- Newsletter subscription pop-up upon entering landing page.
- Promo "Free Same Day Delivery in Bali\*" on landing page and shop pages. Condition: \*above 500,000 IDR
  purchase value and on weekdays ordered before 3:30pm only, after 3:30pm delivery next day.

**Landing page**

- Instead of "Shop Prints", make it "Shop"; when you click on it, it goes to the shop page that starts with
  Shop by: best sellers, followed by themes, followed by product types, followed by wall decors.
- The image doesn't need anything below, doesn't need to go anywhere.
- Below "Shop By": "Wall Decor", then "How We Make Them", then "Our Latest Articles", then "Partnerships",
  then "Stores", "Antiques" at the bottom.

**Shop pages**

- Remove "300gsm cotton. Archival inks" and "printed in our own workshop".
- Need to add sizes. Prices should change (together with size) depending on product type.

## Open with the owner (the build takes these defaults until answered)

| #   | Question                                                                                     | Default until answered                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | The new tagline                                                                              | Today's tagline stays; it is a CMS field, so the owner types the new one in.                                                                                                            |
| F2  | The new name for "Partnership"                                                               | The label is a CMS/lexicon value, kept as "Partnerships" until named; the URL stays.                                                                                                    |
| F3  | "Don't need a retailer sign-up"                                                              | The retailer self-service sign-up is removed from the public page; both categories get an enquiry form. The partner sign-in for existing accounts is kept off the page but not deleted. |
| F4  | Which stores are the two flagships, and which stores belong to Lombok / Ubud / Amed / Canggu | A `flagship` switch and an `area` choice on each store, set by the owner in the admin.                                                                                                  |
| F5  | Best sellers: hand-picked or from sales                                                      | Hand-picked in the admin (a switch on the product), so it works before there are sales.                                                                                                 |
| F6  | The sizes and their prices per product type                                                  | Sizes are the product's variants (label + own price), already priced on the server; the owner enters the real sizes and prices.                                                         |
| F7  | The articles (PDFs and their cover pictures)                                                 | An `articles` collection the owner fills; the seed adds none.                                                                                                                           |
| F8  | Where newsletter sign-ups go                                                                 | Stored as leads of kind `newsletter` in the CMS; no mailing service is connected.                                                                                                       |
| F9  | Same-day delivery: is it applied to the price, or only promised                              | Shown as a promise (banner + checkout note with the 15:30 weekday cut-off, Asia/Makassar); the free delivery above Rp 500.000 is the existing `freeOverIdr` setting. No new money rule. |
