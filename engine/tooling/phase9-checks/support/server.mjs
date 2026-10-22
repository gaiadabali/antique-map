// A tiny local HTTP server for the phase-9 check tests: a route map from pathname to a handler that
// answers `{ status, headers, body }`. Records every request (path + Host) so a test can prove what
// was — and was not — asked for. Not a `.test.mjs`, so Vitest does not run it directly.
import { createServer } from 'node:http'

/**
 * `startServer(routes)` → `{ base, hits, close() }`. `routes` maps a pathname to a handler
 * `(req) => { status, headers?, body? }`; an unknown path answers 404.
 */
export async function startServer(routes) {
  const hits = []
  const server = createServer((req, res) => {
    const path = req.url
    hits.push({ path, host: req.headers.host })
    const handler = routes[path.split('?')[0]]
    const answer = handler ? handler(req) : { status: 404, body: 'not found' }
    res.writeHead(answer.status, { 'content-type': 'text/html', ...(answer.headers ?? {}) })
    res.end(answer.body ?? '')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const close = () => new Promise((resolve) => server.close(resolve))
  return { base, hits, close }
}

/** A minimal, valid SEO page: canonical, both hreflang alternates plus x-default, a description. */
export function goodPage({ origin, path, ld = [] }) {
  const canonical = `${origin}${path}`
  const alt = (lang, href) => `<link rel="alternate" hreflang="${lang}" href="${href}" />`
  const scripts = ld.map(
    (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`,
  )
  return [
    '<!doctype html><html><head>',
    `<link rel="canonical" href="${canonical}" />`,
    alt('en', canonical),
    alt('id', `${origin}/id${path}`),
    alt('x-default', canonical),
    '<meta name="description" content="A page" />',
    ...scripts,
    '</head><body></body></html>',
  ].join('')
}
