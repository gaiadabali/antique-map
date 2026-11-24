/**
 * Signs the suite's accounts in once, before any worker starts (`sessions.ts` says why): the owner
 * (first-registered when the database has no user, else logged in) and, when the admin fixtures
 * can be made, the editor and the two store users. An account whose saved token the server still
 * accepts is not signed in again, so a second run against the same server spends no sign-in on
 * them; a token the server refuses is forgotten first, so no spec is handed a dead one.
 *
 * Best effort by design: against a server this run does not own (staging), or without the
 * database the fixtures need, a missing token only means that spec signs in itself. Nothing here
 * weakens a spec; it only spends fewer sign-ins.
 */
import { request } from '@playwright/test'

import { ACCOUNTS, PASSWORD } from '../admin/accounts'
import { fixtures, localPort } from '../admin/local.mjs'
import { forgetTokens, readSessions, saveTokens } from './sessions'

const SHOP_HOST = 'shop.localhost'

export default async function globalSetup(): Promise<void> {
  const port = localPort()
  const api = await request.newContext({
    baseURL: `http://127.0.0.1:${port}`,
    extraHTTPHeaders: { Host: `${SHOP_HOST}:${port}` },
  })
  // A cold server compiles each route on its first hit.
  const accepted = async (token: string): Promise<boolean> => {
    const res = await api.get('/api/users/me', {
      headers: { Authorization: `JWT ${token}` },
      timeout: 120_000,
    })
    return res.ok() && Boolean(((await res.json()) as { user?: unknown }).user)
  }
  const login = async (email: string): Promise<string | null> => {
    const res = await api.post('/api/users/login', {
      data: { email, password: PASSWORD },
      timeout: 120_000,
    })
    return res.ok() ? (((await res.json()) as { token?: string }).token ?? null) : null
  }
  /** The account's saved token while the server accepts it, else a fresh sign-in's (saved). */
  const session = async (email: string): Promise<string | null> => {
    const saved = readSessions()[email]
    if (saved && (await accepted(saved))) return saved
    if (saved) forgetTokens([email])
    const token = await login(email)
    if (token) saveTokens({ [email]: token })
    return token
  }
  try {
    let owner = await session(ACCOUNTS.owner.email)
    if (!owner) {
      // No user yet: first-register answers 403 once one exists, so this only ever makes the first.
      await api.post('/api/users/first-register', {
        timeout: 120_000,
        data: {
          email: ACCOUNTS.owner.email,
          password: PASSWORD,
          confirmPassword: PASSWORD,
          name: 'E2E Owner',
        },
      })
      owner = await session(ACCOUNTS.owner.email)
    }
    if (!owner) {
      console.warn('global setup: the owner could not sign in; specs sign in on their own')
      return
    }

    try {
      // The editor and the two store users (idempotent), made through today's one CMS. The shop
      // app's own config (`playwright.shop.config.ts`) sets E2E_FIXTURES=none: its database is
      // cms-shop's, whose accounts are made with it, so only the sign-ins below are spent.
      if (process.env.E2E_FIXTURES !== 'none') fixtures()
    } catch (error) {
      console.warn(`global setup: admin fixtures not made (${String(error).slice(0, 120)})`)
      return
    }
    for (const key of ['editor', 'storeA', 'storeB'] as const) await session(ACCOUNTS[key].email)
  } catch (error) {
    console.warn(
      `global setup: skipped (${String(error).slice(0, 160)}); specs sign in on their own`,
    )
  } finally {
    await api.dispose()
  }
}
