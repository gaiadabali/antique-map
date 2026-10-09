# Gate: CMS clarity pass (presentation only)

Branch `worktree-agent-a6dee2a0f0c25c173`. Staff-facing labels, groups, tabs and nav only. No schema change.

## What changed (before to after)

1. **Sidebar groups name the site.** Antiques/Makers/Places: "Gallery — antiques" / "Galeri — antik". Products/Discount codes: "Shop — products" / "Toko daring — produk". Images, Masters, Terms: "Photos and tags (both sites)" / "Foto dan tag (kedua situs)". Events and Payment events: new last group "Technical records" / "Catatan teknis". Registry order changed so groups read daily work first (`registries/collections.ts`).
2. **Working views first.** Order panel, Leads inbox, Import stock moved from `afterNavLinks` to `beforeNavLinks`, under a "Daily work" / "Pekerjaan harian" heading (`admin/daily-work-heading.jsx`). Role gating unchanged (store staff see the Order panel only).
3. **Antiques list.** `defaultColumns` = title, stockNumber, objectType, status, \_status, updatedAt. "Status" relabelled "Availability" / "Ketersediaan"; cataloguing status "Cataloguing progress" / "Progres katalogisasi". **Cause of the doubled columns:** config, not saved preferences. `cataloguing.aiDraft` holds one group per draftable field, and two are named `title` and `objectType` (`ai/fields.ts` `entry()`). Payload's list column builder showed those groups as extra "Title" and "Object type" columns that read the real field's value. Reproduced on a user with no saved preference. Fixed with `admin.disableListColumn: true` on the `aiDraft`, `aiDraftRun` and entry groups (admin-only flag).
4. **Which site.** Antiques and Products descriptions start with the site line (en+id). Site settings: each site in its own unnamed tab; the shop's group has inner unnamed tabs (Contact and notices, Chat and AI, Checkout and delivery, Alerts); `bands` has `initCollapsed: false`. Plain descriptions on welcome code, order expiry, quote window, token cap, daily budget, chat and drafting toggles, checkout, free-delivery threshold, alerts, reply promise, announcement, lead emails. Field order inside the groups is unchanged on purpose: it fixes the order in `payload-types.ts`.
5. **Jargon.** Masters = "Original photo files (private)" / "File foto asli (privat)" with a plain description; Terms = "Tags and grades" / "Tag dan kelas kondisi", its "Vocabulary" label = "Type" / "Jenis"; product Category label and description say to pick a shop category.
6. **Orders / Stock.** History, Payment, Driver, Handed back and Store as sold were named groups/array, so each is wrapped in an unnamed closed collapsible (`collections/orders/collapse.ts`). Stock: count labelled "Count on the shelf — type the number here"; derived quantity "Can still be sold (worked out for you)", moved to the sidebar (`admin.position`) so the count comes first without reordering fields.
7. **Leads list** shows `payload.name` and `payload.message` first.
8. **Language switch (user request).** Admin default language stays English (`fallbackLanguage` untouched). A "Bahasa Indonesia / English" link at the bottom of the nav (`admin/language-link.jsx`, `afterNavLinks`) goes to `/admin/account#language-select`, Payload's own Language setting. Titled in both languages.

## Schema unchanged: proof

- `pnpm migrate:create ux_check` against the throwaway DB: "No schema changes detected ... nothing written"; no file written, no migration committed.
- `pnpm check:generated`: no drift. `payload-types.ts` is regenerated and committed, and it is NOT byte-identical to main, for two non-schema reasons: (a) Payload copies `admin.description` into JSDoc comments, so new descriptions add comment lines; (b) the `collections` map follows the registry order, which was reordered for the sidebar. Sorted-line comparison old vs new showed only added comment lines. No field type, name or optionality changed.
- `importMap.js` regenerated (DailyWorkHeading, LanguageLink).

## Checks

lint, typecheck, format:check, check:filesize, check:generated pass. `vitest --project packages engine/packages/cms`: 854 passed, 288 skipped; 1 file fails to load (`admin/leads/inbox.db.test.ts`, "Unknown file extension .css" from react-image-crop, in the file area another agent owns, unrelated).

## Screenshots (`docs/gates/cms-clarity/shots/`)

Owner and store, at 390 and 1280 px, on a production build (`LOCAL_PRODUCTION_BUILD=1`, own port, DB copy of `indies_p14_gallery`): `<role>-<width>-sidebar`, `order`, `stock-create`; owner only: `antiques-list`, `antique-edit`, `product-edit`, `site-settings-gallery`, `site-settings-shop`, `site-settings-shop-delivery`, `terms-list`, `leads-list`, `masters-list`, `account-language` (1280).
