// The real generator registry `pnpm check:generated` runs. Every entry
// regenerates a file nobody hand-edits (PARALLEL-TRACKS.md §2) **with
// `BRAND` unset**, once per brand where a brand can shape it (ARCHITECTURE.md
// §2), and diffs the result against what is committed.
//
// TASKS.md 3.2.d is `generate:types` and `generate:importmap` per app, and
// 3.2 as a whole is Payload boot — none of that exists yet, so every entry
// here is a stub that reports its own gap rather than guessing at a command
// that does not exist. **What 3.2 must plug in, precisely:**
//
//  1. `migration-snapshot` — a script that runs Payload's migration
//     generator against `engine/packages/cms/src/collections/**` with
//     `BRAND` unset and prints the resulting SQL/snapshot to stdout, diffed
//     against the last committed file in `engine/packages/cms/src/migrations`
//     (SCH generates migrations, TASKS.md's rule "only the SCH lead
//     generates migrations" — this gate only proves nobody's dev server
//     silently drifted from what SCH committed).
//  2. `payload-types.gallery` / `payload-types.emporium` — `pnpm --filter
//     gallery run generate:types` / `--filter emporium run generate:types`,
//     each with `BRAND` unset, diffed against `engine/apps/<app>/payload-types.ts`.
//  3. `importmap.gallery` / `importmap.emporium` — `pnpm --filter gallery run
//     generate:importmap` / `--filter emporium run generate:importmap`, each
//     with `BRAND` unset, diffed against
//     `engine/apps/<app>/src/app/(payload)/admin/importMap.js`.
//
// Each stub below already names its `committedPath`, so once 3.2 adds the
// `generate:*` script to an app's `package.json`, filling in `regenerate` is
// the one-line change from "run the stub" to "run `pnpm --filter <app> run
// <script>` via `execFileSync` and return its stdout" — `config-drift.mjs`
// needs no change.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function notWiredUp(reason) {
  return async () => {
    void reason
    return null
  }
}

export const REAL_GENERATORS = [
  {
    name: 'migration-snapshot',
    committedPath: 'engine/packages/cms/src/migrations',
    regenerate: notWiredUp('no Payload migration generator yet (3.2)'),
  },
  {
    name: 'payload-types.gallery',
    committedPath: 'engine/apps/gallery/payload-types.ts',
    regenerate: notWiredUp('no generate:types script on engine/apps/gallery yet (3.2.d)'),
  },
  {
    name: 'payload-types.emporium',
    committedPath: 'engine/apps/emporium/payload-types.ts',
    regenerate: notWiredUp('no generate:types script on engine/apps/emporium yet (3.2.d)'),
  },
  {
    name: 'importmap.gallery',
    committedPath: 'engine/apps/gallery/src/app/(payload)/admin/importMap.js',
    regenerate: notWiredUp('no generate:importmap script on engine/apps/gallery yet (3.2.d)'),
  },
  {
    name: 'importmap.emporium',
    committedPath: 'engine/apps/emporium/src/app/(payload)/admin/importMap.js',
    regenerate: notWiredUp('no generate:importmap script on engine/apps/emporium yet (3.2.d)'),
  },
]

/** True once any real generator's prerequisite exists — lets the CLI print a sharper message than "always degraded". */
export function anyGeneratorWired(repoRoot) {
  return REAL_GENERATORS.some((g) => existsSync(join(repoRoot, g.committedPath)))
}
