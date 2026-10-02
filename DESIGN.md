# Design source — Indies Platform

What the design team delivered, what we adopted, what we added, and the swap points for the owner's UI/UX pass.

## Source

The design team's system lives in `docs/design/input/claude-design-2026-09/_ds/luxury-minimalist-design-system-c156e5b1-7edc-4777-82f1-e102cdc8a274/`.
Relevant files: `readme.md`, `styles.css`, `tokens/{colors,fonts,spacing,typography}.css`,
`components/components.css` and the two home-page HTML drawings. The system is **brand-neutral**:
it exposes a three-tier token model (primitive → brand → semantic) and expects a palette per product.

## Adopted

- **Three-tier tokens.** Tier-1 primitives are raw scales (colour ramps, type sizes, 4 px space scale,
  radii, shadows, motion). Tier-2 brand variables live in one file per site. Tier-3 semantic aliases are
  the only values components read.
- **Type pairing.** Cormorant Garamond for display and numerals, Karla for everything read or clicked —
  the owner's decision from the client's deck slide 7. Both load via `next/font/google` and are served
  from our own origin at runtime (self-hosted by Next.js).
- **Square, borderless, paper-on-ground look; 80 px header; zebra section tones; edge-to-edge bands with
  a locked 1340 px inner boundary.** Kept as the shared component language; exact padding and overrides
  from the design team's page drawings are re-expressed as tokens.
- **Motion rules.** `cubic-bezier(0.22, 0.61, 0.36, 1)`, 320 ms in / 200 ms out, `prefers-reduced-motion`
  absolute.

## Added or changed

- **A palette per site.** The design team's single palette (linen `#F4F1EA`, off-black `#1A1916`, bronze
  `#6E5A43`, champagne `#A39174`) becomes the **gallery** default on `:root`. The **shop** overrides it
  inside `[data-site="shop"]` with a warmer cream ground (`#F1E5D3`) and brown ink (`#593D21`) while
  keeping the same bronze accent and square editorial feel — visibly a sibling.
- **Accessibility overrides to the kit.** Hairlines and focus are at least 1 px / 2 px and pass 3:1;
  input boundaries are darker than the decorative 0.5 px rule.
- **Font variable names.** The semantic tokens `--font-display` and `--font-body` fall back to the
  Google family names and only resolve to the self-hosted faces once `fontVariables` is applied to
  `<html>` (task 4.3).
- **Lint gate.** `engine/tooling/token-lint/cli.mjs` fails the build on any raw hex, `rgb()/rgba()/hsl()/hsla()`,
  or `font-family` outside the token files.

## Swap points

The owner's later look-and-feel pass changes only these:

| What to change | File(s) |
| --- | --- |
| Final colours (Q16) | `engine/apps/web/src/sites/gallery/tokens/brand.css`<br>`engine/apps/web/src/sites/shop/tokens/brand.css` |
| Font family | `engine/apps/web/src/shared/styles/fonts.ts` |
| Hero media (film, poster, images) | CMS `pages` and `media` (not code) |
| Logo lock-up | `site-settings` assets + the logo component in 4.3 |
| Motion per site | `shared/styles/tokens/primitives.css` motion section + component CSS Modules in 4.2 |

No dark mode. No raw colour or `font-family` is allowed outside the token files.
