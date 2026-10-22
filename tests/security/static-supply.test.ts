/**
 * The static checks on the supply chain and secrets (TASKS.md 10.1.a, 10.1.b; SECURITY.md D1–D3,
 * K1–K3): lockfile, exact pins, install-script policy, the workflows that scan and audit, and a
 * ripgrep-style pass for keys over the tree. The registry audit itself (`pnpm audit --prod`) needs
 * the network and is run by hand and by the CI job, recorded in docs/gates/security.md.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { ROOT, walk } from './support/scan'

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8')

describe('dependencies and supply chain are pinned and gated (D1–D3, K3)', () => {
  const manifests = walk(
    '.',
    (file) => file.endsWith('package.json') && !file.includes('node_modules'),
  )
    .filter((file) => !file.path.startsWith('.claude/') && !file.path.startsWith('docs/'))
    .map((file) => ({
      path: file.path,
      json: JSON.parse(file.text) as Record<string, Record<string, string>>,
    }))

  it('has a committed lockfile, and CI installs with --frozen-lockfile', () => {
    expect(existsSync(path.join(ROOT, 'pnpm-lock.yaml'))).toBe(true)
    expect(read('.github/actions/setup-pnpm-node/action.yml')).toContain('--frozen-lockfile')
  })

  it('pins every dependency of every package to an exact version (workspace links aside)', () => {
    const loose: string[] = []
    for (const { path: file, json } of manifests) {
      for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        for (const [name, range] of Object.entries(json[field] ?? {})) {
          if (range.startsWith('workspace:')) continue
          if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(range))
            loose.push(`${file}: ${name}@${range}`)
        }
      }
    }
    expect(loose).toEqual([])
  })

  it('has one version of next and one of payload and its plugins', () => {
    const versions = new Map<string, Set<string>>()
    for (const { json } of manifests) {
      for (const [name, range] of Object.entries({
        ...json.dependencies,
        ...json.devDependencies,
      })) {
        const family =
          name === 'next'
            ? 'next'
            : name === 'payload' || name.startsWith('@payloadcms/')
              ? 'payload'
              : null
        if (family === null) continue
        versions.set(family, (versions.get(family) ?? new Set()).add(range))
      }
    }
    expect([...versions.get('next')!]).toHaveLength(1)
    expect([...versions.get('payload')!]).toHaveLength(1)
  })

  it('allows install scripts only for listed packages (pnpm 11 allowBuilds)', () => {
    const workspace = read('pnpm-workspace.yaml')
    expect(workspace).toMatch(/allowBuilds:/)
    const block = workspace.split('allowBuilds:')[1]!.split(/\n\S/)[0]!
    const allowed = [...block.matchAll(/^\s+['"]?([@\w/.-]+)['"]?:\s*true/gm)].map((m) => m[1])
    expect(allowed.sort()).toEqual(['@tailwindcss/oxide', 'esbuild', 'sharp', 'unrs-resolver'])
  })

  it('has the secret scan and the audit in the workflows (K3, D2)', () => {
    expect(read('.github/workflows/secrets.yml')).toMatch(/gitleaks/)
    expect(read('.github/workflows/ci.yml')).toMatch(/pnpm audit --prod --audit-level=high/)
  })
})

describe('no secret is tracked (K1, K2)', () => {
  it('ignores every .env file but the example, which holds placeholders only', () => {
    const ignore = read('.gitignore')
    expect(ignore).toMatch(/^\.env$/m)
    expect(ignore).toMatch(/^\.env\.\*$/m)
    expect(ignore).toMatch(/^!\.env\.example$/m)
    const example = read('.env.example')
    for (const line of example.split('\n')) {
      const match = /^([A-Z0-9_]*(?:SECRET|KEY|PASSWORD|TOKEN)[A-Z0-9_]*)=(.*)$/.exec(line.trim())
      if (match === null) continue
      expect(match[2], `${match[1]} in .env.example holds a real-looking value`).toMatch(
        /^$|^(change-me|dev-only|your-|example|minioadmin|postgres|replace)|^<|^\$\{/i,
      )
    }
  })

  it('has no private key, cloud key or provider token in the tree (a ripgrep-style pass)', () => {
    const patterns: Array<[string, RegExp]> = [
      ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/],
      ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
      ['Anthropic key', /\bsk-ant-(?!test)[A-Za-z0-9_-]{20,}/],
      ['OpenAI/OpenRouter key', /\bsk-(?:or-)?[A-Za-z0-9]{32,}\b/],
      ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
      ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
      ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
      ['Midtrans live server key', /\bMid-server-(?!TEST|indies)[A-Za-z0-9_-]{20,}/],
    ]
    const known = [/AKIAIOSFODNN7EXAMPLE/]
    const files = [
      ...walk('engine', (f) => /\.(ts|tsx|js|jsx|mjs|json|yml|yaml|md|sh)$/.test(f)),
      ...walk('scripts', () => true),
      ...walk('.github', () => true),
      ...walk(
        'tests',
        (f) =>
          /\.(ts|mjs|json)$/.test(f) && !f.includes('support') && !f.endsWith('static.test.ts'),
      ),
      { path: '.env.example', text: read('.env.example') },
    ]
    const hits: string[] = []
    for (const file of files) {
      for (const [name, pattern] of patterns) {
        const match = pattern.exec(file.text)
        if (match !== null && !known.some((k) => k.test(match[0])))
          hits.push(`${file.path}: ${name}`)
      }
    }
    expect(hits).toEqual([])
  })
})
