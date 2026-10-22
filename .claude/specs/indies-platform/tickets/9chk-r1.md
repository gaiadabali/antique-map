# Ticket 9chk-r1 — review round for the phase-9 check tools

**Lane:** deepseek · **Branch:** `w/9chk` (stay on it) · **Report:** `docs/reports/workers/9chk.md` (create it)

The first run (`a11ab4a`) built `engine/tooling/phase9-checks/**`, the spec being `9chk.md` (read it first, along with
AGENTS.md and `.claude/worker-rules.md`). It ended before writing the report. Review found one real bug:
**the base and the canonical origin are treated as the same.** On staging the tools are pointed at an IP, a tunnel or
`http://localhost:<port>` (`--base`, with `--host`), while pages, sitemaps and redirects speak the site's
**canonical origin** (e.g. `https://gallery.staging.example`).

## Do (owned paths: `engine/tooling/phase9-checks/**`, the report)
1. Add `--origin <canonical origin>` to both CLIs (`cli-args.mjs`). It defaults to `--base`. It must be an
   absolute `http(s)://host[:port]` with no path; throw a readable error otherwise.
2. Add `toBase(url, { origin, base })` in a small module with tests. A URL on `origin` is rewritten onto `base`
   (same path and query). A URL on any other origin is returned unchanged and flagged `foreign`.
3. **seo-crawl:** sitemap `<loc>`s and index children are requested through `toBase`. A foreign `<loc>` is a
   failure ("sitemap lists another origin") and is never requested. The canonical check compares against
   `--origin`, not `--base`. Report URLs stay in their canonical form.
4. **old-urls:** the 301's `Location` is judged against `--origin`. An absolute Location on another origin is a
   failure ("redirects off-site"). A Location on `origin` is requested through `toBase`, and the hop is then
   checked for 200 as before. Also report 301 separately from 302, 307 and 308 in the counts: the 9.4.c Check asks
   for **301**. A 308 is acceptable only when its Location differs from the request just by a trailing slash, and
   it is counted as `normalised`. Any other non-301 redirect is a failure with its status.
5. Tests, added beside the existing ones (same runner): "a sitemap on the canonical origin is crawled through the
   base"; "a sitemap loc on another origin fails and is not requested"; "the canonical is checked against
   --origin"; "a 301 to the canonical origin is followed through the base"; "a 302 is a failure for 9.4.c"; "a
   redirect off-site fails"; "--origin with a path is refused".
6. Write `docs/reports/workers/9chk.md` in the `docs/WORKFLOW.md` §5 format. Cover what the tools do, every
   flag, and both test runs' output. State that the end-to-end run against a production build is still owed:
   the dev database is down for repair, so do **not** run `pnpm build`, `db:fresh` or any docker command.
   Commit it.

## Verify (paste output)
```bash
pnpm vitest run engine/tooling/phase9-checks
node engine/tooling/phase9-checks/old-urls.mjs --help
node engine/tooling/phase9-checks/seo-crawl.mjs --help
pnpm check:file-size 2>/dev/null || true
```
Do not run `pnpm verify` either. It is not needed here, and the orchestrator runs it at merge.
