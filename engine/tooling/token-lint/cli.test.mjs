import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { defaultTargets, run } from './cli.mjs'

describe('token-lint', () => {
  let dir

  function setup(files) {
    dir = mkdtempSync(join(tmpdir(), 'token-lint-'))
    const target = join(dir, 'src')
    for (const [rel, content] of Object.entries(files)) {
      const path = join(target, rel)
      mkdirSync(
        path.slice(0, path.lastIndexOf('/') >= 0 ? path.lastIndexOf('/') : path.lastIndexOf('\\')),
        { recursive: true },
      )
      writeFileSync(path, content, 'utf8')
    }
    return target
  }

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('fails on a hex colour in a component', () => {
    const target = setup({
      'card.tsx': 'export function Card() { return <div style={{ color: "#ff0000" }} /> }',
    })
    const v = run(target)
    expect(v.length).toBeGreaterThan(0)
    expect(v.some((x) => x.kind === 'hex colour' && x.snippet === '#ff0000')).toBe(true)
  })

  it('passes on the same hex colour inside a token file', () => {
    const target = setup({
      'shared/styles/tokens/primitives.css': ':root { --primitive-red: #ff0000; }',
      'sites/gallery/tokens/brand.css': ':root { --brand-red: #ff0000; }',
      'sites/shop/tokens/brand.css': '[data-site="shop"] { --brand-red: #ff0000; }',
    })
    expect(run(target)).toHaveLength(0)
  })

  it("passes on the shared UI package's token files and fails on its components", () => {
    const target = setup({
      'styles/tokens/primitives.css': ':root { --primitive-red: #ff0000; }',
      'styles/tokens/gallery.css': ':root { --brand-red: #ff0000; }',
      'components/card/card.module.css': '.card { color: #00ff00; }',
    })
    const v = run(target)
    expect(v).toHaveLength(1)
    expect(v[0].snippet).toBe('#00ff00')
  })

  it('lints several directories at once, and by default the app and the UI package', () => {
    const a = setup({ 'a.css': '.a { color: #ff0000; }' })
    const b = join(dir, 'other')
    mkdirSync(b)
    writeFileSync(join(b, 'b.css'), '.b { font-family: Arial; }', 'utf8')
    const v = run([a, b])
    expect(v.map((x) => x.kind).sort()).toEqual(['font-family declaration', 'hex colour'])
    const dirs = defaultTargets.map((t) => t.replace(/\\/g, '/'))
    expect(dirs.some((t) => t.endsWith('/engine/apps/web/src'))).toBe(true)
    expect(dirs.some((t) => t.endsWith('/engine/packages/ui/src'))).toBe(true)
  })

  it('fails on font-family in CSS and fontFamily in TSX', () => {
    const target = setup({
      'shell.css': '.x { font-family: Arial; }',
      'shell.tsx': 'const s = { fontFamily: "Arial" }',
    })
    const v = run(target)
    expect(v.some((x) => x.kind === 'font-family declaration')).toBe(true)
    expect(v.some((x) => x.kind === 'fontFamily literal')).toBe(true)
  })

  it('fails on rgb and hsl functions', () => {
    const target = setup({
      'bad.css': '.x { color: rgb(255,0,0); background: hsl(0,100%,50%); }',
    })
    const v = run(target)
    expect(v.some((x) => x.kind === 'colour function' && x.snippet.startsWith('rgb'))).toBe(true)
    expect(v.some((x) => x.kind === 'colour function' && x.snippet.startsWith('hsl'))).toBe(true)
  })
})
