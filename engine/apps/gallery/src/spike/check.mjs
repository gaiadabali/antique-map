// The 4.1.e spike's proof, run against a production build (TASKS.md 4.1.e; the write-up is
// docs/spikes/cache-components.md). It behaves as a browser with JavaScript off: it reads the
// HTML as it streams, posts the page's own forms, follows the 303, reads the answer.
//
//   SPIKE_ROUTES=1 SPIKE_CONTROLS=1 SPIKE_PANEL_DELAY_MS=1500 <start the gallery for a brand on PORT>
//   node engine/apps/gallery/src/spike/check.mjs http://localhost:PORT
//
// Exits 1 on the first failed assertion; prints one line per check.
import assert from 'node:assert/strict'
import process from 'node:process'
import { TextDecoder } from 'node:util'

const base = process.argv[2] ?? 'http://localhost:4206'
const CAFE = '/product/1706-caf%C3%A9-de-java'
const BALI = '/product/1726-bali'
const jar = new Map()

const log = (line) => process.stdout.write(`${line}\n`)
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
function keepCookies(response) {
  for (const line of response.headers.getSetCookie()) {
    const [pair] = line.split(';')
    const at = pair.indexOf('=')
    jar.set(pair.slice(0, at), pair.slice(at + 1))
  }
}

async function get(path, headers = {}) {
  const response = await globalThis.fetch(base + path, {
    redirect: 'manual',
    headers: { cookie: cookieHeader(), 'user-agent': 'spike-check', ...headers },
  })
  keepCookies(response)
  return response
}

/** The body as it streams: each chunk with its arrival time after the response began. */
async function stream(path) {
  const started = Date.now()
  const response = await get(path)
  const chunks = []
  const decoder = new TextDecoder()
  for await (const chunk of response.body) {
    chunks.push({ at: Date.now() - started, text: decoder.decode(chunk, { stream: true }) })
  }
  return { response, chunks, html: chunks.map((c) => c.text).join('') }
}

/** Posts a form the page rendered, as a browser without JavaScript does (C13: every write a POST). */
async function postForm(pagePath, html, formName, fields = {}) {
  const at = html.indexOf(`data-form="${formName}"`)
  assert.ok(at > 0, `the page has a ${formName} form`)
  const open = html.lastIndexOf('<form', at)
  const form = html.slice(open, html.indexOf('</form>', at))
  const body = new globalThis.FormData()
  for (const [, name, value] of form.matchAll(
    /<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g,
  )) {
    body.set(name.replaceAll('&amp;', '&'), (value ?? '').replaceAll('&amp;', '&'))
  }
  for (const [name, value] of Object.entries(fields)) body.set(name, value)
  const response = await globalThis.fetch(base + pagePath, {
    method: 'POST',
    redirect: 'manual',
    body,
    headers: { cookie: cookieHeader(), origin: base, 'user-agent': 'spike-check' },
  })
  keepCookies(response)
  return response
}

const panelOf = (html) => /data-availability="(available|sold)"/.exec(html)?.[1] ?? null

async function redirects() {
  const cases = [
    [CAFE, 200, null],
    ['/product/1706-caf%C3%A9-java', 308, CAFE],
    ['/product/1706-van-t%27hoff', 308, CAFE],
    ['/product/1706', 308, CAFE],
    [BALI, 200, null],
    ['/product/1726-b%61li', 308, BALI],
    ['/product/9999-nothing', 404, null],
    ['/id/produk/1706-caf%C3%A9-de-java', 308, '/id/produk/1706-kafe-di-jawa'],
    ['/en/item/1726-bali', 404, null],
  ]
  for (const [path, status, location] of cases) {
    const response = await get(path)
    await response.arrayBuffer()
    assert.equal(response.status, status, `${path} answers ${status}`)
    assert.equal(response.headers.get('location'), location, `${path} Location`)
    if (location) {
      const next = await get(location)
      await next.arrayBuffer()
      assert.equal(next.status, 200, `${location} (one hop) answers 200`)
    }
    log(`ok  ${status} ${path}${location ? ` -> ${location} -> 200` : ''}`)
  }
  for (const path of [`${BALI}/`, '/product//1726-bali']) {
    const response = await get(path)
    await response.arrayBuffer()
    assert.equal(response.status, 308, `${path}: Next's own 308`)
    assert.equal(
      response.headers.get('x-middleware-rewrite'),
      null,
      `${path}: answered before the proxy`,
    )
    log(`ok  308 ${path} -> ${response.headers.get('location')} (Next, before the proxy)`)
  }
}

async function firstFlush() {
  const { response, chunks, html } = await stream(CAFE)
  assert.equal(response.status, 200)
  const panelAt = chunks.find((c) => /data-availability="(available|sold)"/.test(c.text))?.at
  assert.ok(panelAt !== undefined, 'the purchase panel arrives')
  const first = chunks
    .filter((c) => c.at < panelAt)
    .map((c) => c.text)
    .join('')
  const later = chunks
    .filter((c) => c.at >= panelAt)
    .map((c) => c.text)
    .join('')
  for (const needle of [
    '<h1>',
    'data-form="ship-to"',
    'data-form="bag-remove"',
    'data-availability="pending"',
  ]) {
    assert.ok(first.includes(needle), `the first flush holds ${needle}`)
  }
  assert.ok(!later.includes('<form'), 'no form is streamed')
  assert.ok(!/role="status"/.test(later), 'no post result is streamed')
  log(
    `ok  first flush at ${chunks[0].at} ms holds the body and every form; the panel streamed at ${panelAt} ms with no form (${html.length} bytes)`,
  )
}

async function availabilityNeverStale() {
  let { html } = await stream(CAFE)
  for (let round = 1; round <= 6; round += 1) {
    const want = panelOf(html) === 'sold' ? 'available' : 'sold'
    const posted = await postForm(CAFE, html, 'availability')
    assert.equal(posted.status, 303, 'the control answers 303')
    ;({ html } = await stream(CAFE))
    assert.equal(
      panelOf(html),
      want,
      `round ${round}: availability is ${want} on the very next request`,
    )
  }
  log(
    'ok  availability flipped 6 times: every next request saw the new state (revalidateTag { expire: 0 })',
  )
}

async function recordStaleWhileRevalidate() {
  const edition = (html) => Number(/edition (\d+)/.exec(html)?.[1])
  let { html } = await stream(BALI)
  const before = edition(html)
  assert.equal((await postForm(BALI, html, 'edit')).status, 303)
  const seen = []
  for (let attempt = 0; attempt < 10 && seen.at(-1) !== before + 1; attempt += 1) {
    ;({ html } = await stream(BALI))
    seen.push(edition(html))
  }
  assert.equal(seen.at(-1), before + 1, 'the edit is served once revalidated')
  log(
    `ok  record edition ${before} -> ${before + 1}; editions seen after the edit: ${seen.join(', ')} (revalidateTag 'max': stale while it revalidates)`,
  )
}

async function postsWithoutJavaScript() {
  let { html } = await stream(CAFE)
  if (panelOf(html) === 'sold') {
    // A process's spike store outlives a run: start from an available item, as a sale is undone.
    assert.equal((await postForm(CAFE, html, 'availability')).status, 303)
    ;({ html } = await stream(CAFE))
  }
  const shipTo = await postForm(CAFE, html, 'ship-to', { country: 'NL' })
  assert.equal(shipTo.status, 303, 'ship-to answers 303')
  assert.equal(shipTo.headers.get('location'), CAFE)
  // A router prefetch renders the page in full, but must leave the result for the visitor (fe #4).
  // Next answers an RSC request without its `_rsc` query with a 307 to add it: follow, as the router does.
  const prefetch = await globalThis.fetch(base + CAFE, {
    headers: {
      cookie: cookieHeader(),
      'user-agent': 'spike-check',
      rsc: '1',
      'next-router-prefetch': '1',
      'sec-fetch-dest': 'empty', // what a browser adds to the router's fetch()
    },
  })
  assert.equal(prefetch.status, 200)
  assert.equal(
    prefetch.headers.get('content-type')?.split(';')[0],
    'text/x-component',
    'an RSC answer',
  )
  assert.match(await prefetch.text(), /Shipping to NL/, 'the prefetch sees the result')
  ;({ html } = await stream(shipTo.headers.get('location')))
  assert.match(
    html,
    /role="status"[^>]*>Shipping to NL: prices in EUR\./,
    'the result is in the body',
  )
  assert.match(html, /priced in EUR for delivery to NL/, 'the panel reads the new ship-to')
  log(
    'ok  ship-to posted without JavaScript: 303; a prefetch left the result; the result in the body, the panel in EUR',
  )

  const removed = await postForm(CAFE, html, 'bag-remove')
  assert.equal(removed.status, 303, 'bag-line removal answers 303')
  ;({ html } = await stream(removed.headers.get('location')))
  assert.match(html, /role="status"[^>]*>Removed No\. 1706 from your bag\./)
  assert.equal([...html.matchAll(/data-form="bag-remove"/g)].length, 1, 'one line left')
  ;({ html } = await stream(CAFE))
  assert.ok(!/role="status"/.test(html), 'a result is shown once')
  log('ok  bag line removed without JavaScript: 303, the result in the body, shown once')
}

for (const check of [
  redirects,
  firstFlush,
  postsWithoutJavaScript,
  availabilityNeverStale,
  recordStaleWhileRevalidate,
]) {
  try {
    await check()
  } catch (error) {
    log(`FAIL ${check.name}: ${error.message}`)
    process.exit(1)
  }
}
log('spike check: all passed')
