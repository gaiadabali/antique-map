/* global process, console, window, document, URL */
/**
 * Opens pages in Chromium and reports every Content-Security-Policy violation the browser raises
 * (SECURITY.md B2, B6; TASKS.md 10.1.d). A manual drive against a local production build — never
 * pointed at a deployed host from here:
 *
 *   node tests/security/csp-browser-check.mjs http://shop.localhost:4390 /,/checkout,/admin/login
 *
 * Exit code 1 when any page raised a violation, a console error that names the policy, or no
 * policy header at all. A violation the Maps script's own Google Fonts request raises on the
 * checkout page is the one B6 expects (`fonts.googleapis.com` / `fonts.gstatic.com`) and is
 * counted apart, not as a failure.
 */
import { chromium } from '@playwright/test'

const [base, paths = '/'] = process.argv.slice(2)
if (!base) {
  console.error('usage: node csp-browser-check.mjs <origin> <path,path,…>')
  process.exit(2)
}

const browser = await chromium.launch()
let failed = false
for (const path of paths.split(',')) {
  const page = await (await browser.newContext()).newPage()
  const violations = []
  const errors = []
  await page.addInitScript(() => {
    window.__csp = []
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__csp.push(
        `${event.violatedDirective} blocked ${event.blockedURI || event.sample || 'inline'}`,
      )
    })
  })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  const response = await page
    .goto(new URL(path, base).href, { waitUntil: 'networkidle' })
    .catch((error) => {
      errors.push(`navigation: ${error.message}`)
      return null
    })
  violations.push(...(await page.evaluate(() => window.__csp ?? []).catch(() => [])))
  const header = response?.headers()['content-security-policy'] ?? null
  const hydrated = await page
    .evaluate(
      () => Boolean(document.querySelector('script[nonce]')) || document.readyState === 'complete',
    )
    .catch(() => false)
  const expected = violations.filter((v) => /fonts\.(googleapis|gstatic)\.com/.test(v))
  const unexpected = violations.filter((v) => !expected.includes(v))
  const policyErrors = errors.filter(
    (e) => /content security policy/i.test(e) && !/fonts\.(googleapis|gstatic)/.test(e),
  )
  const bad = header === null || unexpected.length > 0 || policyErrors.length > 0
  failed ||= bad
  console.log(
    JSON.stringify({
      path,
      status: response?.status() ?? null,
      policy: header === null ? 'MISSING' : 'present',
      nonceOnScripts: await page.locator('script[nonce]').count(),
      violations: unexpected,
      expectedFontBlocks: expected.length,
      policyConsoleErrors: policyErrors,
      hydrated,
    }),
  )
  await page.context().close()
}
await browser.close()
process.exit(failed ? 1 : 0)
