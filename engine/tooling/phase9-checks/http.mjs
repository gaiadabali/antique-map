// A minimal HTTP client for the phase-9 checks. `fetch` cannot send a custom `Host` header (undici
// drops it), and the ticket needs `--host` for an IP or tunnel base — so this uses node:http, which
// can. GET and HEAD only, never a cookie, never a body; a redirect is returned, never followed
// (`maxRedirects: 0` behaviour), so the caller sees the one hop and its `Location`.
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export const USER_AGENT = 'indies-phase9-check/1.0 (+read-only)'

/**
 * One request. Resolves `{ status, headers, url, body }`; `body` is '' for HEAD.
 * Rejects only on a transport error (a refusal, a DNS miss, an abort).
 */
export function requestOnce(url, { method = 'GET', host, timeoutMs = 15_000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const send = parsed.protocol === 'https:' ? httpsRequest : httpRequest
    const headers = { 'User-Agent': USER_AGENT, Accept: '*/*' }
    if (host) headers.Host = host
    const req = send(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            url,
            body: method === 'HEAD' ? '' : Buffer.concat(chunks).toString('utf8'),
          })
        })
        res.on('error', reject)
      },
    )
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)))
    req.on('error', reject)
    req.end()
  })
}

/**
 * `Location` resolved against the request URL — an absolute target, a root-relative one or a
 * relative one; `null` when the header is absent. `//host/x` is protocol-relative and left as the
 * browser would read it (another origin), which the caller treats as a failure.
 */
export function resolveLocation(base, location) {
  if (!location) return null
  if (location.startsWith('//')) return `${new URL(base).protocol}${location}`
  try {
    return new URL(location, base).href
  } catch {
    return null
  }
}
