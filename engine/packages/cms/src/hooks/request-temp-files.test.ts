/**
 * The endpoint clean-up's parts (TASKS.md 8.3.h), without a database: which paths a request's
 * files name, that a wrapped handler removes them on success and on a throw and never throws
 * itself, and that the config the apps run wraps every endpoint it has. The real REST handler is
 * driven in `request-temp-files.db.test.ts`.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { PayloadHandler, PayloadRequest } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cleaningUpAfter,
  cleansUp,
  removingRequestTempFiles,
  requestTempFilePaths,
} from './request-temp-files'

const dirs: string[] = []
function folder(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'cms-temp-files-unit-'))
  dirs.push(dir)
  return dir
}
function tempFile(dir: string, name: string): string {
  const file = path.join(dir, name)
  writeFileSync(file, 'streamed')
  return file
}
const fileAt = (tempFilePath: string) => ({
  data: Buffer.alloc(0),
  mimetype: 'x/y',
  name: 'n',
  size: 1,
  tempFilePath,
})

/** A request whose config streams files to `dir`, with the files given. */
function request(dir: string, files: Partial<Pick<PayloadRequest, 'file' | 'files'>> = {}) {
  const logger = { error: vi.fn() }
  const req = { ...files, payload: { config: { upload: { tempFileDir: dir } }, logger } }
  return { req: req as unknown as PayloadRequest, logger }
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('the paths a request’s files name', () => {
  it('takes req.file and every field of req.files, arrays included, each once', () => {
    const dir = folder()
    const [a, b, c] = ['a', 'b', 'c'].map((n) => path.join(dir, n))
    const file = fileAt(a!)
    const paths = requestTempFilePaths(
      { file, files: { file, other: fileAt(b!), many: [fileAt(c!), fileAt(a!)] } },
      dir,
    )
    expect(paths.sort()).toEqual([a, b, c].sort())
  })

  it('ignores anything outside the temp folder, the folder itself, and in-memory files', () => {
    const dir = folder()
    const outside = path.join(path.dirname(dir), 'precious.db')
    const sneaky = path.join(dir, '..', 'precious.db')
    const paths = requestTempFilePaths(
      { files: { a: fileAt(outside), b: fileAt(sneaky), c: fileAt(dir), d: fileAt('') } },
      dir,
    )
    expect(paths).toEqual([])
  })
})

describe('a handler made to clean up', () => {
  it('removes the request’s files once it has answered', async () => {
    const dir = folder()
    const file = tempFile(dir, 'tmp-1')
    const handler: PayloadHandler = () => Response.json({ ok: true })
    const { req } = request(dir, { file: fileAt(file) })
    const response = await cleaningUpAfter(handler)(req)
    expect(response.status).toBe(200)
    expect(existsSync(file)).toBe(false)
  })

  it('removes them when the handler throws, and throws the handler’s error', async () => {
    const dir = folder()
    const file = tempFile(dir, 'tmp-2')
    const failure = new Error('refused')
    const handler: PayloadHandler = () => Promise.reject(failure)
    const { req } = request(dir, { files: { attachment: fileAt(file) } })
    await expect(cleaningUpAfter(handler)(req)).rejects.toBe(failure)
    expect(existsSync(file)).toBe(false)
  })

  it('logs a file it cannot remove and still answers', async () => {
    const dir = folder()
    const notAFile = path.join(dir, 'tmp-3')
    mkdirSync(notAFile)
    const { req, logger } = request(dir, { file: fileAt(notAFile) })
    const response = await cleaningUpAfter(() => new Response('ok'))(req)
    expect(await response.text()).toBe('ok')
    expect(logger.error).toHaveBeenCalledOnce()
  })

  it('removes a file inside the folder its request’s config names, read at request time', async () => {
    const [first, second] = [folder(), folder()]
    const elsewhere = tempFile(first, 'tmp-4')
    const { req } = request(second, { file: fileAt(elsewhere) })
    await cleaningUpAfter(() => new Response('ok'))(req)
    expect(existsSync(elsewhere)).toBe(true)
  })

  it('is wrapped once, however often the config is built', () => {
    const handler: PayloadHandler = () => new Response('ok')
    const once = cleaningUpAfter(handler)
    expect(cleansUp(handler)).toBe(false)
    expect(cleansUp(once)).toBe(true)
    expect(cleaningUpAfter(once)).toBe(once)
  })
})

describe('the config the apps run', () => {
  it('cleans up after every endpoint — root, every collection, every global', async () => {
    const { default: built } = await import('../payload.config')
    const config = await built
    const endpoints = [
      ...config.endpoints,
      ...config.collections.flatMap((c) => c.endpoints || []),
      ...config.globals.flatMap((g) => g.endpoints || []),
    ]
    const posts = endpoints.filter((e) => e.method === 'post' || e.method === 'patch')
    expect(posts.length).toBeGreaterThan(config.collections.length)
    expect(endpoints.filter((e) => !cleansUp(e.handler))).toEqual([])
  }, 30_000) // a cold import of the whole Payload config takes over 5 s on a slow disk

  it('gives each collection endpoint objects of its own — Payload shares its built-in ones', () => {
    const shared = { method: 'post' as const, path: '/', handler: () => new Response('ok') }
    const config = removingRequestTempFiles({
      endpoints: [],
      collections: [{ endpoints: [shared] }, { endpoints: [shared] }, { endpoints: false }],
      globals: [],
    } as never)
    const [a, b, c] = config.collections.map((collection) => collection.endpoints)
    expect(a).not.toBe(b)
    expect((a as unknown[])[0]).not.toBe(shared)
    expect(c).toBe(false)
    expect(cleansUp(shared.handler)).toBe(false)
  })
})
