/**
 * The root Vitest config (1.1's placeholder, filled in here — TASKS.md
 * 2.2.e). Vitest 5 has no separate workspace file: one root config's
 * `test.projects` replaces it. Three projects, one per area of the repo,
 * so a reporter can tell "a tooling gate broke" from "a contract package
 * broke" apart, and so each area can carry its own `test.environment` once
 * it needs one (the apps will want `jsdom`; the tooling and packages stay
 * on plain Node).
 */
import { defineConfig } from 'vitest/config'

const EXCLUDE = ['**/node_modules/**', '**/.claude/**', '**/dist/**', '**/.next/**']
/** Real-database tests: they need Postgres, so they have their own project (`pnpm test:db`). */
const DB_TESTS = '**/*.db.test.{ts,tsx}'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tooling',
          include: ['engine/tooling/**/*.test.{mjs,ts}', 'scripts/**/*.test.mjs'],
          exclude: EXCLUDE,
        },
      },
      {
        test: {
          name: 'packages',
          include: ['engine/packages/**/*.test.{mjs,ts,tsx}'],
          exclude: [...EXCLUDE, DB_TESTS],
        },
      },
      {
        test: {
          name: 'apps',
          include: ['engine/apps/**/*.test.{mjs,ts,tsx}'],
          exclude: [...EXCLUDE, DB_TESTS],
        },
      },
      {
        test: {
          name: 'db',
          include: ['engine/**/*.db.test.{ts,tsx}'],
          // One migrated and one pushed template database, built once; each file clones one.
          globalSetup: ['engine/packages/cms/src/db/test-templates.global-setup.ts'],
          exclude: EXCLUDE,
        },
      },
    ],
  },
})
