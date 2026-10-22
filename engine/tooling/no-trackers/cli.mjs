// `check:trackers` — the CLI the CI gate calls (TASKS.md 9.2.c). Scans the built web app
// (`engine/apps/web/.next/`) for third-party trackers and exits 1 listing every hit; a build that
// does not exist is a failure too — the check only means something against a real build.
import { findTrackers, DEFAULT_ROOT } from './no-trackers.mjs'

const root = process.argv[2] ?? DEFAULT_ROOT
const hits = findTrackers(root)
if (hits === null) {
  console.error(
    `no-trackers: no build found at ${root} — run the build first (the check needs one)`,
  )
  process.exit(1)
}
if (hits.length > 0) {
  console.error(`no-trackers: ${hits.length} third-party tracker hit(s) in ${root}:`)
  for (const { path, name, fragment } of hits) {
    console.error(`  ${path}: ${name} (${fragment})`)
  }
  process.exit(1)
}
console.log(`no-trackers: ${root} is clean — first-party only (ANALYTICS.md)`)
