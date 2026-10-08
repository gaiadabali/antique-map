#!/usr/bin/env node
/**
 * A stand-in media origin for a local production build (TASKS.md 10.2.a). A local build has no
 * object storage, so no page there shows a derivative and Lighthouse measures pages without their
 * pictures. This serves `/derivatives/v1/<any asset>/<width>.<format>` from ONE real staging
 * derivative of the same width and format (real bytes, real ladder), with CORS open, so a page's
 * `srcSet`, `<picture>` and preload behave as on staging. Every image is the same picture: it
 * measures weight and loading, not content.
 *
 *   node tests/e2e/a11y/media-proxy.mjs [port=9100]
 *   (then start the app with MEDIA_PUBLIC_URL=http://127.0.0.1:9100 and mark the local media
 *   rows' derivatives ready — see docs/gates/performance.md)
 */
/* global process, console, Buffer */
import { createServer } from 'node:http'
import { get } from 'node:https'

const PORT = Number(process.argv[2] ?? 9100)
const SOURCE =
  'https://old-east-indies.gaiada.com/_media/derivatives/v1/41efd02d9a750b1a14a2d144e453d9fd'
const cache = new Map()

function fetchRung(file) {
  return new Promise((resolve, reject) => {
    get(`${SOURCE}/${file}`, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () =>
        resolve({
          status: response.statusCode ?? 502,
          type: response.headers['content-type'] ?? 'application/octet-stream',
          body: Buffer.concat(chunks),
        }),
      )
    }).on('error', reject)
  })
}

createServer(async (request, response) => {
  const match = /^\/derivatives\/v1\/[0-9a-f]{32}\/(\d+\.(?:webp|avif))$/.exec(request.url ?? '')
  const headers = {
    'access-control-allow-origin': '*',
    'cross-origin-resource-policy': 'cross-origin',
  }
  if (!match) {
    response.writeHead(404, headers).end()
    return
  }
  try {
    const file = match[1]
    if (!cache.has(file)) cache.set(file, await fetchRung(file))
    const rung = cache.get(file)
    response.writeHead(rung.status, {
      ...headers,
      'content-type': rung.type,
      'content-length': rung.body.length,
      'cache-control': 'public, max-age=31536000, immutable',
    })
    response.end(rung.body)
  } catch {
    response.writeHead(502, headers).end()
  }
}).listen(PORT, '127.0.0.1', () => console.log(`media stand-in on http://127.0.0.1:${PORT}`))
