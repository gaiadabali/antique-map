/**
 * The process's lead dependencies, built on the first request — never at import or at build, which
 * touches no database (CONVENTIONS.md §12): Payload through `@engine/cms/instance` loaded with
 * `import()`, Turnstile with `TURNSTILE_SECRET` (host-only; unset means every check fails — it
 * fails closed), the per-address limit in this process's memory.
 */
import 'server-only'

import { notifyNewLead, type LeadMailer } from './notify'
import type { LeadDeps } from './ports'
import { PostLimiter } from './rate'

const limiter = new PostLimiter()
let mailer: Promise<LeadMailer> | null = null
let built: Promise<LeadDeps> | null = null

/** The owner's mailer, for the chat's hand-off to reuse with `notifyNewLead` (5.3.c). */
export function leadMailer(): Promise<LeadMailer> {
  if (mailer === null) {
    const next = (async () => {
      const [{ cms }, { payloadLeadMailer }] = await Promise.all([
        import('@engine/cms/instance'),
        import('./adapters'),
      ])
      return payloadLeadMailer(await cms())
    })()
    mailer = next
    next.catch(() => {
      if (mailer === next) mailer = null
    })
  }
  return mailer
}

async function build(): Promise<LeadDeps> {
  const [{ cms }, { payloadLeadStore }, { turnstileVerifier }] = await Promise.all([
    import('@engine/cms/instance'),
    import('./adapters'),
    import('../chat/adapters/turnstile'),
  ])
  const payload = await cms()
  const secret = process.env.TURNSTILE_SECRET?.trim()
  const verifier = secret && secret.length >= 16 ? turnstileVerifier(secret) : null
  return {
    now: () => new Date(),
    verifyTurnstile: async (token, remoteIp) =>
      verifier !== null &&
      (await verifier.verify(token, remoteIp, AbortSignal.timeout(10_000))).success,
    allow: (ipKey) => limiter.allow(ipKey),
    store: payloadLeadStore(payload),
    notify: async (notice) => notifyNewLead(await leadMailer(), notice),
    log: (message) => console.warn(message),
  }
}

export function leadDeps(): Promise<LeadDeps> {
  if (built === null) {
    const next = build()
    built = next
    next.catch(() => {
      if (built === next) built = null
    })
  }
  return built
}
