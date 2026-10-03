/**
 * The chat wired to doubles: a scripted model, a Turnstile double, the in-memory store and
 * catalogue, and the real routes. `chat.open()` starts a session as the panel would; `send()`
 * posts a message and returns the parsed event stream.
 */
import { vi } from 'vitest'

import { ConsentStore } from '../consent'
import type { ChatDeps } from '../context'
import { SpendLedger } from '../cost'
import { chatModels } from '../env'
import { chatKeys } from '../identity'
import { ChatLimiter } from '../limits'
import type { TurnstileVerifier } from '../ports'
import type { ChatEvent, SiteKey } from '../types'
import { FakeModel, type Script } from './fake-model'
import { MemoryReader, MemoryStore } from './memory'

export const HOSTS = {
  gallery: 'indies-gallery.gaiada.com',
  shop: 'old-east-indies.gaiada.com',
} as const

export const ENV = {
  GALLERY_HOSTS: HOSTS.gallery,
  SHOP_HOSTS: HOSTS.shop,
  ADMIN_HOST: HOSTS.shop,
  PAYLOAD_SECRET: 'test-payload-secret-0123456789abcdef',
} as const

export const CANARY = 'cnry-TESTCANARY'

/** Site origins are read from the process's environment: set it for the test. */
export function stubSiteEnv(): void {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
}

export class TurnstileDouble implements TurnstileVerifier {
  pass = true
  calls = 0
  /** The hostname Cloudflare reports the token was solved on. */
  hostname: string = HOSTS.gallery
  async verify() {
    this.calls += 1
    return { success: this.pass, hostname: this.pass ? this.hostname : null }
  }
}

export type Harness = ReturnType<typeof harness>

export function harness(script: Script, label?: (text: string) => string) {
  const model = new FakeModel(script, label)
  const store = new MemoryStore()
  const reader = new MemoryReader()
  const turnstile = new TurnstileDouble()
  let clock = Date.parse('2026-10-03T03:00:00.000Z')
  const deps: ChatDeps = {
    env: ENV,
    now: () => new Date(clock),
    models: chatModels({}),
    model,
    turnstile,
    keys: chatKeys(ENV),
    store,
    reader,
    limiter: new ChatLimiter(),
    consents: new ConsentStore(() => clock),
    spend: new SpendLedger(async () => store.spentToday),
    canary: CANARY,
  }
  return {
    deps,
    model,
    store,
    reader,
    turnstile,
    /** Moves the clock on (past the 2 s message pace, say). */
    tick(ms = 3000) {
      clock += ms
    },
  }
}

export function chatRequest(
  site: SiteKey,
  path: string,
  init: {
    method?: string
    body?: unknown
    cookie?: string | null
    origin?: string | null
    ip?: string
  } = {},
): Request {
  const headers = new Headers({ host: HOSTS[site], 'content-type': 'application/json' })
  const origin = init.origin === undefined ? `https://${HOSTS[site]}` : init.origin
  if (origin !== null) headers.set('origin', origin)
  if (init.cookie) headers.set('cookie', init.cookie)
  headers.set('x-forwarded-for', `198.51.100.7, ${init.ip ?? '203.0.113.9'}`)
  return new Request(`https://${HOSTS[site]}${path}`, {
    method: init.method ?? 'POST',
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  })
}

export async function eventsOf(response: Response): Promise<ChatEvent[]> {
  const text = await response.text()
  return text
    .split('\n\n')
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice(6)) as ChatEvent)
}

export function cookieOf(response: Response): string {
  const header = response.headers.get('set-cookie') ?? ''
  return header.split(';')[0] ?? ''
}

export function textOf(events: readonly ChatEvent[]): string {
  return events.flatMap((e) => (e.type === 'delta' ? [e.text] : [])).join('')
}
