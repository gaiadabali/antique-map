import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { run } from './cli.mjs'

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
