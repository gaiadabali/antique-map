// The scan that finds each dynamic `import()` in code and reads its argument (4.7.a): what it
// counts as a string the walk follows, what as an expression the gate fails, and what prose it
// steps over.
import { describe, expect, it } from 'vitest'

import { dynamicImports } from './scan.mjs'

describe('dynamicImports', () => {
  it.each([
    ["import('fs/promises')", [{ specifier: 'fs/promises' }]],
    ['import("./a")', [{ specifier: './a' }]],
    ['import(`./a`)', [{ specifier: './a' }]],
    ["import(\n  /* why */ './a'\n)", [{ specifier: './a' }]],
    ["import('./x.json', { with: { type: 'json' } })", [{ specifier: './x.json' }]],
    ["type T = typeof import('./types')", [{ specifier: './types' }]],
  ])('a plain string is a specifier: %s', (source, found) => {
    expect(dynamicImports(source)).toEqual(found)
  })

  it.each([
    ["const m = 'zod'; await import(m)", 'm'],
    ['import(`./copy/${code}.json`)', '`./copy/${code}.json`'],
    ["import('./copy/' + code)", "'./copy/' + code"],
    ['import(pick(name))', 'pick(name)'],
    ['a / b; import(c) / 2', 'c'],
  ])('anything else is an expression: %s', (source, expression) => {
    expect(dynamicImports(source)).toEqual([{ expression }])
  })

  it('shortens a long expression in what it reports', () => {
    const [found] = dynamicImports(`import(${'x'.repeat(100)})`)
    expect(found.expression).toHaveLength(60)
    expect(found.expression.endsWith('…')).toBe(true)
  })

  it('steps over comments, strings, regular expressions and a method named import', () => {
    const source = [
      '// a lazy import(chunk) would go here',
      '/* import(other) */',
      "const note = 'see import(next)'",
      String.raw`const pattern = /import\(x\)/g`,
      'loader.import(name); maybe?.import(name)',
    ].join('\n')
    expect(dynamicImports(source)).toEqual([])
  })

  it('scans the code inside a template literal, nested ones included', () => {
    const source = "const t = `${import('./a')} and ${`${import(n)}`}` + `import(prose)`"
    expect(dynamicImports(source)).toEqual([{ specifier: './a' }, { expression: 'n' }])
  })
})
