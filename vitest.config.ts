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
          exclude: EXCLUDE,
        },
      },
      {
        test: {
          name: 'apps',
          include: ['engine/apps/**/*.test.{mjs,ts,tsx}'],
          exclude: EXCLUDE,
        },
      },
    ],
  },
})
