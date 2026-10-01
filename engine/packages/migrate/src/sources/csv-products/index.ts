/**
 * The csv-products source (TASKS.md 7.3) — today its legacy URL discovery
 * (`legacy-urls/`, MIGRATION.md §10): the Wayback CDX index, the archived
 * sitemaps and a Search Console export, inventoried into the brand's
 * `content/legacy/` folder. Its code is plain `.mjs`, run by `node` with no
 * build step, and the workspace type-checks with `allowJs: false`, so
 * TypeScript cannot import it: this entry names the CLI and its commands as
 * typed data, so `@engine/migrate/sources/csv-products` resolves for a caller
 * that spawns the CLI. Run it with `pnpm --filter @engine/migrate legacy-urls`
 * or as its README shows.
 */

/** The discovery CLI's commands (`legacy-urls/cli.mjs`); each ends by rebuilding the inventory. */
export const LEGACY_URL_COMMANDS = ['fetch-cdx', 'fetch-sitemaps', 'import-gsc', 'build'] as const
export type LegacyUrlCommand = (typeof LEGACY_URL_COMMANDS)[number]

/** The discovery CLI, as a file URL: `node <it> <command> --site <brand>/content/legacy/discovery.json`. */
export const LEGACY_URLS_CLI: URL = new URL('./legacy-urls/cli.mjs', import.meta.url)
