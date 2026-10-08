/**
 * Cloudflare Turnstile's `siteverify` (SECURITY.md §2.10; S1: an allow-listed outbound host). The
 * secret is `TURNSTILE_SECRET`, host-only. A network failure or a non-200 answer is a failed
 * check — the chat fails closed. On a workstation, Cloudflare's published test secrets (always
 * pass / always fail) stand in for a real one.
 */
import 'server-only'

import type { TurnstileResult, TurnstileVerifier } from '../ports'

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Cloudflare's published always-pass test secret. Staging carries it until the owner's keys (OA8);
 * its answers name `example.com`, so the session's hostname match cannot hold, and it protects
 * nothing anyway. A result verified with it says so (`testKey`); a real secret never does.
 */
export const TEST_PASS_SECRET = '1x0000000000000000000000000000000AA'

export function turnstileVerifier(secret: string): TurnstileVerifier {
  return {
    async verify(token, remoteIp, signal): Promise<TurnstileResult> {
      const form = new URLSearchParams({ secret, response: token })
      if (remoteIp) form.set('remoteip', remoteIp)
      try {
        const response = await fetch(SITEVERIFY_URL, {
          method: 'POST',
          body: form,
          signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]),
          cache: 'no-store',
          redirect: 'error',
        })
        if (!response.ok) return { success: false, hostname: null }
        const body = (await response.json()) as { success?: unknown; hostname?: unknown }
        return {
          success: body.success === true,
          hostname: typeof body.hostname === 'string' ? body.hostname.toLowerCase() : null,
          ...(secret === TEST_PASS_SECRET ? { testKey: true } : {}),
        }
      } catch {
        return { success: false, hostname: null }
      }
    },
  }
}
