// ESLint 9 flat config for the whole workspace (HAR). Formatting belongs to
// Prettier; eslint-config-prettier switches off every rule that would fight it.
//
// The import boundaries below are the ones CONVENTIONS.md §5 and AGENTS.md
// depend on:
//   1. apps never import Payload outside their (payload) admin mount,
//   2. packages never import an app,
//   3. view-models has no runtime dependencies (type imports only; its
//      package.json declares no dependencies).
// Each is proven by a planted violation in the 0.1 report. The engine fences
// after them (TASKS.md 5.4.b–c) are each proven by one in the 5.4 report.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import json from '@eslint/json'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import { RENDERING_RULES } from './engine/tooling/next-config-parity/eslint-rules.mjs'
import { PAYLOAD_FENCES } from './engine/tooling/route-parity/eslint-fences.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const CODE = ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}']

// App package names, read from disk so rule 2 keeps up as apps are added or
// renamed; no name is hard-coded here.
const appsDir = join(root, 'engine', 'apps')
const appNames = existsSync(appsDir)
  ? readdirSync(appsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(appsDir, entry.name, 'package.json'))
      .filter((file) => existsSync(file))
      .map((file) => JSON.parse(readFileSync(file, 'utf8')).name)
      .filter((name) => typeof name === 'string')
  : []

const payloadImports = {
  group: [
    'payload',
    'payload/**',
    '@payloadcms/**',
    '@payload-config',
    '@engine/cms',
    '@engine/cms/**',
  ],
  message:
    'Apps never import Payload outside src/app/(payload)/: render view models from @engine/view-models and read through @engine/loaders (CONVENTIONS.md §5).',
}

const appImportMessage =
  'Packages never import an app: move the shared code into a package both can use (PARALLEL-TRACKS.md §1).'
const appImports = [
  { regex: '^(\\.\\./)+(engine/)?apps(/|$)', caseSensitive: true, message: appImportMessage },
  { regex: '(^|/)engine/apps(/|$)', caseSensitive: true, message: appImportMessage },
  ...appNames.map((name) => ({ group: [name, `${name}/**`], message: appImportMessage })),
]

const viewModelRuntimeImports = {
  // Any bare specifier (a package, node:*, @engine/*) as a value import.
  regex: '^(?![./])',
  caseSensitive: true,
  allowTypeImports: true,
  message:
    'view-models has no runtime dependencies: use `import type` for other packages, or a relative import (DESIGN-SYSTEM.md §3).',
}

// view-models' package.json may declare devDependencies (for types) and
// nothing a consumer would have to install.
const RUNTIME_DEPENDENCY_FIELDS = new Set([
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'bundleDependencies',
  'bundledDependencies',
])
const boundaries = {
  meta: { name: 'engine-boundaries' },
  rules: {
    'no-runtime-dependencies': {
      meta: {
        type: 'problem',
        docs: { description: 'A package.json that must declare no runtime dependencies' },
        messages: {
          found:
            'view-models has no runtime dependencies: "{{field}}" must be empty (type-only packages go in devDependencies).',
        },
        schema: [],
      },
      create(context) {
        return {
          'Document > Object > Member'(node) {
            const field = node.name.type === 'String' ? node.name.value : node.name.name
            const isEmpty = node.value.type === 'Object' ? node.value.members.length === 0 : false
            if (RUNTIME_DEPENDENCY_FIELDS.has(field) && !isEmpty) {
              context.report({ node, messageId: 'found', data: { field } })
            }
          },
        }
      },
    },
  },
}

// The engine fences (TASKS.md 5.4.b–c): the rules live beside the gates they back — route parity
// (ARCHITECTURE.md §15's package fences) and next.config parity (CONVENTIONS.md §12's rendering
// rules); the files each one covers are named here. `import type` passes every import fence.
const fences = { meta: { name: 'engine-fences' }, rules: { ...PAYLOAD_FENCES, ...RENDERING_RULES } }
const HTTP = 'engine/packages/http/src'
const APP = 'engine/apps/*/src/app'
const code = (dir) => `${dir}/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}`
const TESTS = ['**/*.test.*', '**/test/**']
const fenced = (rule, files, ignores = [], options = []) => ({
  name: `fence: ${rule}${options.length ? ' (the locale layout)' : ''}`,
  files,
  ignores,
  plugins: { fences },
  rules: { [`fences/${rule}`]: ['error', ...options] },
})
const STOREFRONT = [code('engine/apps/*/src'), code('engine/packages')]
const NOT_STOREFRONT = [`${APP}/(payload)/**`, 'engine/packages/cms/**']
const fenceConfigs = [
  // 5.4.b — how engine routes reach Payload (ARCHITECTURE.md §15).
  fenced('payload-by-value', [code(HTTP)], [`${HTTP}/**/payload-*.ts`]),
  fenced('payload-module-static', [code(HTTP)], TESTS),
  fenced('cms-no-http', [code('engine/packages/cms')]),
  fenced('http-no-loaders', [code('engine/packages/http')]),
  fenced('loaders-http-manifest-only', [code('engine/packages/loaders')]),
  fenced('manifest-types-only', [`${HTTP}/manifest.ts`, code(`${HTTP}/manifest`)], TESTS),
  // Its tests excepted: leaf.test.ts reads C1's schema to prove the leaf.
  fenced('cache-leaf', [code('engine/packages/cache')], TESTS),
  // 5.4.b — one route segment config (CONVENTIONS.md §12).
  fenced('segment-config', [code(APP)], [`${APP}/(payload)/**`]),
  fenced('segment-config', [`${APP}/\\(site\\)/\\[locale\\]/layout.tsx`], [], [{ layout: true }]),
  // 5.4.c — no storefront link or form prefetches (CONVENTIONS.md §12).
  // Storefront code: the apps outside (payload), every package but cms. The link primitive
  // (TASKS.md 11.1.c) is the one file that imports next/link, by this path.
  fenced('no-next-link', STOREFRONT, [
    ...NOT_STOREFRONT,
    'engine/packages/ui/src/primitives/link.tsx',
  ]),
  // "called nowhere": all of engine/, the admin included (qa's 5.4 re-gate, L4).
  fenced('no-router-prefetch', [code('engine')]),
  fenced('no-next-form', [code('engine')]),
]

export default defineConfig([
  includeIgnoreFile(join(root, '.gitignore'), 'gitignored paths'),
  globalIgnores(
    [
      '**/payload-types.ts',
      '**/importMap.js',
      '**/next-env.d.ts',
      'engine/packages/cms/src/migrations/**',
    ],
    'generated files (regenerated, never edited: PARALLEL-TRACKS.md §2)',
  ),
  globalIgnores(['docs/design/input/**'], 'design input from the owner, kept as delivered'),
  globalIgnores(
    ['.claude/**'],
    'agent skills and settings, vendored as delivered (Prettier skips them too)',
  ),

  {
    name: 'code: recommended',
    files: CODE,
    extends: [js.configs.recommended, tseslint.configs.recommended],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    name: 'node scripts and tooling',
    files: ['*.{js,mjs,cjs}', 'scripts/**', 'engine/tooling/**', '.github/scripts/**'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    name: 'boundary 1: apps import Payload only in (payload)',
    files: ['engine/apps/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
    ignores: ['engine/apps/*/src/app/(payload)/**', 'engine/apps/*/next.config.*'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [payloadImports] }],
    },
  },
  {
    name: 'boundary 2: packages never import apps',
    files: ['engine/packages/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: appImports }],
    },
  },
  {
    // Repeats boundary 2's patterns: a later config replaces a rule's options.
    name: 'boundary 3: view-models imports types only',
    files: ['engine/packages/view-models/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
    // Its tests run the fixtures (vitest, CURRENCY_EXPONENT) and ship to no consumer; boundary
    // 2 still applies to them.
    ignores: ['engine/packages/view-models/test/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [...appImports, viewModelRuntimeImports] },
      ],
    },
  },
  {
    name: 'boundary 3: view-models declares no runtime dependencies',
    files: ['engine/packages/view-models/package.json'],
    plugins: { json, boundaries },
    language: 'json/json',
    rules: { 'boundaries/no-runtime-dependencies': 'error' },
  },

  ...fenceConfigs,

  prettier,
])
