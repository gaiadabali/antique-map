/**
 * Signs the suite's accounts in once, before any worker starts (`sessions.ts` says why): the owner
 * (first-registered when the database has no user, else logged in) and, when the admin fixtures
 * can be made, the editor and the two store users. The tokens are saved for the specs to reuse.
 *
 * Best effort by design: against a server this run does not own (staging), or without the
 * database the fixtures need, a missing token only means that spec signs in itself. Nothing here
 * weakens a spec; it only spends fewer sign-ins.
 */
import { request } from '@playwright/test'

import { ACCOUNTS, PASSWORD } from '../admin/accounts'
import { fixtures, localPort } from '../admin/local.mjs'
import { saveTokens } from './sessions'

const SHOP_HOST = 'shop.localhost'

export default async function globalSetup(): Promise<void> {
  const port = localPort()
  const api = await request.newContext({
    baseURL: `http://127.0.0.1:${port}`,
    extraHTTPHeaders: { Host: `${SHOP_HOST}:${port}` },
  })
  const login = async (email: string): Promise<string | null> => {
    const res = await api.post('/api/users/login', { data: { email, password: PASSWORD } })
    return res.ok() ? (((await res.json()) as { token?: string }).token ?? null) : null
  }
  try {
    let owner = await login(ACCOUNTS.owner.email)
    if (!owner) {
      // No user yet: first-register answers 403 once one exists, so this only ever makes the first.
      await api.post('/api/users/first-register', {
        data: {
          email: ACCOUNTS.owner.email,
          password: PASSWORD,
          confirmPassword: PASSWORD,
          name: 'E2E Owner',
        },
      })
      owner = await login(ACCOUNTS.owner.email)
    }
    if (!owner) {
      console.warn('global setup: the owner could not sign in; specs sign in on their own')
      return
    }
    saveTokens({ [ACCOUNTS.owner.email]: owner })

    try {
      fixtures() // the editor and the two store users (idempotent)
    } catch (error) {
      console.warn(`global setup: admin fixtures not made (${String(error).slice(0, 120)})`)
      return
    }
    for (const key of ['editor', 'storeA', 'storeB'] as const) {
      const token = await login(ACCOUNTS[key].email)
      if (token) saveTokens({ [ACCOUNTS[key].email]: token })
    }
  } finally {
    await api.dispose()
  }
}
