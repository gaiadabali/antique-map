/**
 * The bot user agents collect drops (ANALYTICS.md §6 step 2): a maintained list — crawlers,
 * monitors and uptime checks, headless browsers, and the HTTP libraries no visitor's browser is —
 * matched case-insensitively as substrings. An empty user agent is dropped before this runs.
 * Beacons only; server events are never filtered by user agent (a bot cannot pay).
 */

/** Substring fragments, lower case; a user agent holding any of them is not a visitor. */
export const BOT_FRAGMENTS = [
  // Crawlers and SEO
  'googlebot',
  'bingbot',
  'yandexbot',
  'yandeximages',
  'baiduspider',
  'duckduckbot',
  'slurp',
  'sogou',
  'petalbot',
  'gptbot',
  'claudebot',
  'ccbot',
  'bytespider',
  'amazonbot',
  'applebot',
  'facebookexternalhit',
  'meta-externalagent',
  'linkedinbot',
  'twitterbot',
  'whatsapp',
  'telegrambot',
  'mj12bot',
  'ahrefsbot',
  'semrushbot',
  'dotbot',
  'mj12',
  'uptimerobot',
  'pingdom',
  'betteruptime',
  'site24x7',
  'healthcheck',
  // Headless and automation browsers
  'headlesschrome',
  'headlessfirefox',
  'phantomjs',
  'puppeteer',
  'playwright',
  'selenium',
  'webdriver',
  'cypress',
  'lighthouse',
  // HTTP libraries and command-line clients
  'curl/',
  'wget',
  'python-requests',
  'python-urllib',
  'aiohttp',
  'httpx',
  'axios/',
  'node-fetch',
  'undici',
  'got/',
  'go-http-client',
  'java/',
  'okhttp',
  'libwww-perl',
  'scrapy',
  'postman',
  'insomnia/',
] as const

/** Whether a user agent is a bot, a monitor or a library: no event is kept for it. An empty user
 * agent is dropped (§6 step 2), as is a missing one. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  const lowered = userAgent.toLowerCase()
  return BOT_FRAGMENTS.some((fragment) => lowered.includes(fragment))
}
