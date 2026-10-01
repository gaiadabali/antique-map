import { existsSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { STALE_UPLOAD_MS, sweepStaleUploads } from './multipart'

describe('sweeping the upload temp folder', () => {
  it('removes only what has lain untouched longer than any request lasts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sweep-test-'))
    const now = Date.now()
    const stale = join(dir, 'tmp-1-stale')
    const fresh = join(dir, 'tmp-2-fresh')
    writeFileSync(stale, 'left by a request to a collection that takes no file')
    writeFileSync(fresh, 'a request still streaming')
    const old = new Date(now - STALE_UPLOAD_MS - 60_000)
    utimesSync(stale, old, old)
    expect(await sweepStaleUploads(dir, STALE_UPLOAD_MS, now)).toBe(1)
    expect(existsSync(stale)).toBe(false)
    expect(existsSync(fresh)).toBe(true)
  })

  it('answers none for a folder that does not exist yet', async () => {
    expect(await sweepStaleUploads(join(tmpdir(), 'no-such-folder-8-3'))).toBe(0)
  })
})
