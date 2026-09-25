# test — the synthetic third brand

A fictional brand with every module its storefront app supports switched on and
a fictional catalogue. **CI runs it on both storefront apps** and runs the full
e2e suite against it on every build, so anything implicitly shaped like one real
brand — a hard-coded currency, a route segment, a missing module check — fails
here first (NOW!'s synthetic tenant, docs/BRANDS.md §6).

A config names one storefront and the two apps support different modules, so the
test brand has **two configs**, `site/brand.gallery.json` and
`site/brand.emporium.json`, chosen by `TEST_STOREFRONT`, each with its own
database (`pnpm db:fresh --brand test --storefront gallery|emporium`).

It is never deployed.
