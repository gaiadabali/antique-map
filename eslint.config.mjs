// ESLint 9 flat config for the whole workspace (HAR). Formatting belongs to
// Prettier; eslint-config-prettier switches off every rule that would fight it.
//
// One import rule, `@typescript-eslint/no-restricted-imports`, scoped below
// (CARRY-OVER.md §2.3, TASKS.md 1.3.b):
//   1. apps import Payload (and @engine/cms) only under src/server/** and
//      their (payload) admin mount — plus next.config, which wraps the config
//      with withPayload; src/server/** modules start with `import 'server-only'`,
//      so Next fails the build when a Client Component reaches one,
//   2. packages never import an app,
//   3. no next/link or next/form: every page renders per request, so a
//      prefetch costs a database read (a storefront link is a plain <a>),
//   4. view-models has no runtime dependencies (type imports only; its
//      package.json declares no dependencies).
// A later config replaces a rule's options for the files it matches, so each
// scope below lists every pattern that applies to it.
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

const root = dirname(fileURLToPath(import.meta.url))
const CODE = ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}']
const code = (dir) => `${dir}/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}`
// Code files only: a `files` glob that matched a stylesheet would have ESLint parse it.
const APP_SERVER = code('engine/apps/*/src/server')
const APP_PAYLOAD = code('engine/apps/*/src/app/(payload)')
const APP_NEXT_CONFIG = 'engine/apps/*/next.config.{js,mjs,cjs,ts,mts,cts}'

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
    "Apps import Payload only under src/server/** (each module there starts with `import 'server-only'`) and src/app/(payload)/: render view models from @engine/view-models (CONVENTIONS.md §5).",
}

const PREFETCH_WHY =
  'every page renders per request, so a prefetch costs a database read: use a plain <a> or <form> (CARRY-OVER.md §2.3).'
const nextLinkImport = {
  group: ['next/link', 'next/link/**'],
  message: `No next/link: ${PREFETCH_WHY}`,
}
const nextFormImport = {
  group: ['next/form', 'next/form/**'],
  message: `No next/form, whose <Form> prefetches its action: ${PREFETCH_WHY}`,
}
const prefetchImports = [nextLinkImport, nextFormImport]

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
    name: 'imports: apps — Payload only in src/server and (payload); no prefetch',
    files: [code('engine/apps')],
    ignores: [APP_SERVER, APP_PAYLOAD, APP_NEXT_CONFIG],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [payloadImports, ...prefetchImports] },
      ],
    },
  },
  {
    name: 'imports: apps — src/server and next.config may import Payload; no prefetch',
    files: [APP_SERVER, APP_NEXT_CONFIG],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: prefetchImports }],
    },
  },
  {
    name: 'imports: apps — the (payload) admin mount; no next/form',
    files: [APP_PAYLOAD],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [nextFormImport] }],
    },
  },
  {
    name: 'imports: packages never import apps; no prefetch',
    files: [code('engine/packages')],
    ignores: ['engine/packages/cms/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [...appImports, ...prefetchImports] },
      ],
    },
  },
  {
    // The admin's own components live in cms and may link inside the admin.
    name: 'imports: cms never imports apps; no next/form',
    files: [code('engine/packages/cms')],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [...appImports, nextFormImport] },
      ],
    },
  },
  {
    name: 'imports: view-models imports types only',
    files: [code('engine/packages/view-models')],
    // Its tests run the fixtures (vitest, CURRENCY_EXPONENT) and ship to no consumer; the
    // package scope above still applies to them.
    ignores: ['engine/packages/view-models/test/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [...appImports, ...prefetchImports, viewModelRuntimeImports] },
      ],
    },
  },
  {
    name: 'view-models declares no runtime dependencies',
    files: ['engine/packages/view-models/package.json'],
    plugins: { json, boundaries },
    language: 'json/json',
    rules: { 'boundaries/no-runtime-dependencies': 'error' },
  },

  prettier,
])
