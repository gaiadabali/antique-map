# The Cache Components spike (TASKS.md 4.1.e)

Scaffolding for the item route at `src/app/(site)/[locale]/item/[idSlug]/page.tsx`, which the item
surface (phase 33) replaces — remove this folder with it. What it proved is written up in
`docs/spikes/cache-components.md`; `check.mjs` re-runs the proof against a running production
build.

Everything here is fixture data and a file-backed fake of what the domain will own: availability,
the bag, the ship-to market and a post's result (C13 `FORM_RESULT`). The controls that flip
availability or edit a record render and act only with `SPIKE_CONTROLS=1`, which no host sets.
