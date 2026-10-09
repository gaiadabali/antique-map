/** Store staff's admin home is the order panel (TASKS.md 10.8.c); nobody else is moved. */
import { describe, expect, it } from 'vitest'

import { STORE_HOME, StoreHomeRedirect } from './store-home'

describe('StoreHomeRedirect', () => {
  it('sends a store user to the order panel', async () => {
    const error = await StoreHomeRedirect({ user: { collection: 'users', role: 'store' } }).catch(
      (thrown: unknown) => thrown as { digest?: string },
    )
    expect(String((error as { digest?: string }).digest)).toContain('NEXT_REDIRECT')
    expect(String((error as { digest?: string }).digest)).toContain(STORE_HOME)
  })

  it('leaves the owner, an editor and a visitor on the dashboard', async () => {
    for (const user of [{ role: 'owner' }, { role: 'editor' }, null, undefined]) {
      await expect(
        StoreHomeRedirect({ user: user ? { collection: 'users', ...user } : user }),
      ).resolves.toBeNull()
    }
  })
})
