# Indies Gallery — brand folder

Original antique maps, prints, photographs and books of the Indonesian
archipelago and Southeast Asia, 15th–20th century. Runs on the **`gallery`**
storefront app (`engine/apps/gallery`).

**This folder holds configuration, data and assets — never application code**
(docs/BRANDS.md §2).

| Path | Holds |
| ---- | ----- |
| `site/brand.config.json` | the brand's configuration — sellers, markets, modules, routes, tokens (created in task 0.6.d) |
| `site/assets/` | logo, marks, favicons, OG base, licensed fonts |
| `site/copy/` | per-locale copy overrides |
| `content/seed/` | starter content for local and staging databases |
| `content/legacy/` | extracts and mappings from `antiquemapsindonesia.com` (gitignored data; mapping files committed after the curator signs them) — docs/MIGRATION.md |
| `db/` | dumps (gitignored) |

Product brief: `engine/apps/gallery/PRODUCT.md`. Visual world:
`engine/apps/gallery/DESIGN.md` (written in Phase 1). Experience:
`docs/EXPERIENCE-GALLERY.md`.
