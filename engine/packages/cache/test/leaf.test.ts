/**
 * `@engine/cache` stays a leaf (TASKS.md 4.8.c, 4.8.d; ARCHITECTURE.md §15 condition 4): its
 * modules import `next` and no engine package but C1's types; `next` is a peer, pinned for its
 * tests at the apps' version, and the lockfile resolves one `next` — two copies would give
 * `after()` and `revalidateTag()` request stores of their own, and `invalidate()` would find no
 * request inside one. What it restates of other contracts matches them: C13's
 * `REVALIDATE_REQUEST` and C1's work-uid prefix.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { brandConfigSchema } from '@engine/config/schema'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { REVALIDATE_ROUTE, workTag } from '../src/index'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(packageRoot, '../../..')
const read = (file: string) => readFileSync(file, 'utf8')
const json = (file: string) => JSON.parse(read(file))

/** Every module specifier `file` reaches, and whether each is reached for its types alone. */
function specifiers(file: string): Array<{ specifier: string; typeOnly: boolean }> {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true)
  const found: Array<{ specifier: string; typeOnly: boolean }> = []
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      const bindings = clause?.namedBindings
      const allTypes =
        !!clause &&
        (clause.isTypeOnly ||
          (!clause.name &&
            !!bindings &&
            ts.isNamedImports(bindings) &&
            bindings.elements.every((element) => element.isTypeOnly)))
      found.push({ specifier: node.moduleSpecifier.text, typeOnly: allTypes })
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push({ specifier: node.moduleSpecifier.text, typeOnly: node.isTypeOnly })
    } else if (ts.isCallExpression(node)) {
      const [first] = node.arguments
      const dynamic =
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')
      if (dynamic) {
        found.push({
          specifier: first && ts.isStringLiteral(first) ? first.text : '<computed>',
          typeOnly: false,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

describe('a leaf', () => {
  const sources = readdirSync(path.join(packageRoot, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(?:ts|tsx|mts|cts)$/.test(file) && !/\.test\./.test(file))
    .map((file) => path.join(packageRoot, 'src', file))

  it('imports next/cache, next/server, its own modules and C1 types — nothing else', () => {
    expect(sources.length).toBeGreaterThan(0)
    const refused = sources.flatMap((file) =>
      specifiers(file)
        .filter(({ specifier, typeOnly }) => {
          if (specifier.startsWith('./')) return false
          if (specifier === 'next/cache' || specifier === 'next/server') return false
          return !(typeOnly && /^@engine\/config\/(?:schema|constants)$/.test(specifier))
        })
        .map(({ specifier }) => `${path.basename(file)}: ${specifier}`),
    )
    expect(refused).toEqual([])
  })

  it('declares no dependency: next is a peer, and a devDependency at the apps’ exact version', () => {
    const manifest = json(path.join(packageRoot, 'package.json'))
    expect(manifest.dependencies ?? {}).toEqual({})
    expect(manifest.optionalDependencies ?? {}).toEqual({})
    expect(Object.keys(manifest.peerDependencies)).toEqual(['next'])
    const cms = json(path.join(repoRoot, 'engine/packages/cms/package.json'))
    expect(manifest.peerDependencies.next).toBe(cms.peerDependencies.next)
    const apps = readdirSync(path.join(repoRoot, 'engine/apps'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => json(path.join(repoRoot, 'engine/apps', entry.name, 'package.json')))
    expect(apps.length).toBeGreaterThan(0)
    for (const app of apps) expect(manifest.devDependencies.next).toBe(app.dependencies.next)
    // next's own peers, as cms pins them, so the lockfile resolves the very same next.
    for (const peer of ['react', 'react-dom']) {
      expect(manifest.devDependencies[peer]).toBe(cms.devDependencies[peer])
    }
  })

  it('the lockfile resolves one next', () => {
    const lock = read(path.join(repoRoot, 'pnpm-lock.yaml'))
    const resolved = new Set(
      [...lock.matchAll(/^ {6}next:\n {8}specifier: .*\n {8}version: (.*)$/gm)].map((m) => m[1]),
    )
    expect(resolved.size).toBe(1)
    const snapshots = [...lock.matchAll(/^ {2}next@([^:\s]+):$/gm)].map((m) => m[1])
    // One package entry and one snapshot of it: `16.3.6` and `16.3.6(<its peers>)`.
    expect(new Set(snapshots.map((key) => key!.replace(/\(.*$/, ''))).size).toBe(1)
    expect(snapshots.filter((key) => key!.includes('('))).toHaveLength(1)
    expect(lock).toMatch(/^ {2}engine\/packages\/cache:$/m)
  })
})

describe('what it restates', () => {
  it("C13 REVALIDATE_REQUEST and the route's path, as the manifest has them", () => {
    const file = path.join(repoRoot, 'engine/packages/http/src/manifest.ts')
    const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true)
    let declared: Record<string, number> | null = null
    const evaluate = (node: ts.Expression): number => {
      if (ts.isNumericLiteral(node)) return Number(node.text)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) {
        return evaluate(node.left) * evaluate(node.right)
      }
      throw new Error(`REVALIDATE_REQUEST holds ${node.getText()}: teach this test to read it`)
    }
    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText() === 'REVALIDATE_REQUEST' &&
        node.initializer
      ) {
        let value: ts.Expression = node.initializer
        while (ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression
        if (!ts.isObjectLiteralExpression(value)) throw new Error('REVALIDATE_REQUEST moved')
        declared = Object.fromEntries(
          value.properties
            .filter(ts.isPropertyAssignment)
            .map((property) => [property.name.getText(), evaluate(property.initializer)]),
        )
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    expect(declared).toEqual({
      maxTags: REVALIDATE_ROUTE.maxTags,
      maxBodyBytes: REVALIDATE_ROUTE.maxBodyBytes,
    })
    expect(read(file)).toContain(`route('${REVALIDATE_ROUTE.path}', 'WEB', 'revalidate', POST)`)
  })

  it("C1's work-uid prefix: workTag() takes what ids.workUidPrefix does, and no other", () => {
    // The synthetic brand's config, its prefix varied: C1 judges the field in a whole config.
    const config = json(path.join(repoRoot, 'test/site/brand.gallery.json'))
    const prefix = {
      safeParse(value: string) {
        const result = brandConfigSchema.safeParse({
          ...config,
          ids: { ...config.ids, workUidPrefix: value },
        })
        const refused =
          !result.success &&
          result.error.issues.some((issue) => issue.path.join('.') === 'ids.workUidPrefix')
        return { success: !refused }
      },
    }
    expect(brandConfigSchema.safeParse(config).success).toBe(true)
    const samples = [
      'FX',
      'TG',
      'ABC',
      'A1',
      'Z9Z9Z9Z9',
      'ABCDEFGHI',
      'A',
      'a1',
      '1A',
      'A-B',
      'ÅB',
      '',
    ]
    for (const sample of samples) {
      const byC1 = prefix.safeParse(sample).success
      let byTag = true
      try {
        workTag(`${sample}-000123`)
      } catch {
        byTag = false
      }
      expect(byTag, sample).toBe(byC1)
    }
  })
})
