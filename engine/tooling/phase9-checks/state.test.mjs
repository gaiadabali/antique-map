// The state file (ticket: "a rerun with the state file skips answered URLs"). A second sweep with the
// same state asks the server nothing new; a truncated last line from a killed run is tolerated.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { requestOnce } from './http.mjs'
import { checkKeys } from './old-urls-check.mjs'
import { createStateWriter, readState } from './state.mjs'
import { startServer } from './support/server.mjs'

let dir
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

const get = (url) => requestOnce(url, { method: 'GET' })

describe('state', () => {
  it('a rerun with the state file skips answered URLs', async () => {
    const server = await startServer({
      '/a': () => ({ status: 200, body: 'ok' }),
      '/b': () => ({ status: 200, body: 'ok' }),
    })
    try {
      dir = mkdtempSync(join(tmpdir(), 'p9-state-'))
      const statePath = join(dir, 'state.jsonl')
      const keys = ['/a', '/b']

      const first = await checkKeys(server.base, keys, {
        get,
        unresolved: {},
        done: readState(statePath),
        onResult: createStateWriter(statePath),
      })
      expect(first.counts.ok).toBe(2)
      expect(server.hits).toHaveLength(2)

      // The rerun reads the state and asks for nothing.
      const second = await checkKeys(server.base, keys, {
        get,
        unresolved: {},
        done: readState(statePath),
        onResult: createStateWriter(statePath),
      })
      expect(second.counts.ok).toBe(2)
      expect(server.hits).toHaveLength(2)
    } finally {
      await server.close()
    }
  })

  it('ignores a truncated final line', () => {
    dir = mkdtempSync(join(tmpdir(), 'p9-state-'))
    const statePath = join(dir, 'state.jsonl')
    writeFileSync(statePath, '{"url":"/a","outcome":{"kind":"ok"}}\n{"url":"/b","outcome":')
    const done = readState(statePath)
    expect(done.has('/a')).toBe(true)
    expect(done.has('/b')).toBe(false)
  })

  it('reads nothing from a missing file', () => {
    expect(readState(join(tmpdir(), 'p9-does-not-exist.jsonl')).size).toBe(0)
  })
})
