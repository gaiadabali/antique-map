/**
 * Availability decides a purchase, so it is never cached (AGENTS.md; ARCHITECTURE.md §6). A
 * `'use cache'` function that reads it caches stock with the editorial data: a sale, an import or
 * an admin count then shows only after an unrelated product edit — which happened in phase 6
 * (staging showed every product "Out of stock" after its stock was loaded). This reads the source:
 * no function body that opens with `'use cache'` may call `availabilityFor`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SOURCES = ['catalogue.ts']

/** Each top-level function's name and body, split at `function name(` declarations. */
function functionsOf(source: string): { name: string; body: string }[] {
  const starts = [...source.matchAll(/^(?:export )?(?:async )?function (\w+)\(/gm)]
  return starts.map((match, i) => ({
    name: match[1] as string,
    body: source.slice(match.index, starts[i + 1]?.index ?? source.length),
  }))
}

describe('no cached catalogue read takes availability', () => {
  for (const file of SOURCES) {
    const source = readFileSync(join(__dirname, file), 'utf8')
    const fns = functionsOf(source)

    it(`${file} has cached functions to check`, () => {
      expect(fns.some((fn) => fn.body.includes("'use cache'"))).toBe(true)
    })

    for (const fn of fns.filter((each) => each.body.includes("'use cache'"))) {
      it(`${file}: ${fn.name} is cached and never reads availability`, () => {
        expect(fn.body).not.toMatch(/availabilityFor\s*\(/)
      })
    }

    it(`${file}: every availability read waits for the request (connection())`, () => {
      for (const fn of fns.filter((each) => /availabilityFor\s*\(/.test(each.body))) {
        expect(fn.body, fn.name).toMatch(/await connection\(\)/)
      }
    })
  }
})
