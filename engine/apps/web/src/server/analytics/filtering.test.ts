import { describe, expect, it } from 'vitest'

import { isBotUserAgent } from './bots'
import { deviceClass } from './device'

describe('the user agent filter (ANALYTICS.md §6)', () => {
  it('a bot user agent adds no event', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'UptimeRobot/2.0 (http://www.uptimerobot.com/)',
      'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/131.0.0.0',
      'curl/8.4.0',
      'Wget/1.21.2',
      'python-requests/2.31.0',
      'axios/1.6.0',
      'node-fetch/3.3.2',
      'Go-http-client/2.0',
      'GPTBot/1.1 (+https://openai.com/gptbot)',
      'facebookexternalhit/1.1',
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(true)
    }
  })

  it('a visitor browser passes', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe(false)
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false)
  })

  it('an empty user agent adds no event', () => {
    expect(isBotUserAgent('')).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent(undefined)).toBe(true)
    expect(isBotUserAgent('   ')).toBe(true)
  })

  it('a bare runtime name adds no event (a header-less request reaches the route as "node")', () => {
    expect(isBotUserAgent('node')).toBe(true)
    expect(isBotUserAgent('Node')).toBe(true)
    expect(isBotUserAgent('x')).toBe(true)
  })
})

describe('deviceClass (§2)', () => {
  it('mobile, tablet and desktop from the user agent', () => {
    expect(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile')
    expect(deviceClass('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
    expect(deviceClass('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0')).toBe('desktop')
    expect(deviceClass(null)).toBe('desktop')
  })
})
