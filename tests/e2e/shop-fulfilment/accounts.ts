/**
 * The shop fulfilment gate's accounts (TASKS.md 7.4.a). Locally (`GATE_DB=local`) the spec makes
 * its own owner/editor/store accounts through `../admin/local.mjs`'s `fixtures()` — the same
 * `../admin/accounts.ts` four it always makes — and reads them back here with their one shared
 * password. Against staging the orchestrator supplies real accounts by environment variable
 * instead; nothing here creates anything in that case.
 */
import { ACCOUNTS, PASSWORD as LOCAL_PASSWORD } from '../admin/accounts'
import { fixtures } from '../admin/local.mjs'
import { envVar, GATE_DB } from './env'

export type GateAccount = { readonly email: string; readonly password: string }
export type GateAccounts = {
  readonly owner: GateAccount
  readonly storeA: GateAccount
  readonly storeB: GateAccount
  readonly storeAId: number
  readonly storeBId: number
}

function required(name: string): string {
  const value = envVar(name)
  if (!value) throw new Error(`the shop fulfilment gate needs ${name} (GATE_DB is not "local")`)
  return value
}

/** The four accounts and the two fixture stores' ids — made locally, given on staging. */
export function gateAccounts(): GateAccounts {
  if (GATE_DB) {
    const fx = fixtures()
    return {
      owner: { email: ACCOUNTS.owner.email, password: LOCAL_PASSWORD },
      storeA: { email: ACCOUNTS.storeA.email, password: LOCAL_PASSWORD },
      storeB: { email: ACCOUNTS.storeB.email, password: LOCAL_PASSWORD },
      storeAId: fx.stores.a.id,
      storeBId: fx.stores.b.id,
    }
  }
  return {
    owner: { email: required('E2E_OWNER_EMAIL'), password: required('E2E_OWNER_PASSWORD') },
    storeA: { email: required('E2E_STORE_A_EMAIL'), password: required('E2E_STORE_A_PASSWORD') },
    storeB: { email: required('E2E_STORE_B_EMAIL'), password: required('E2E_STORE_B_PASSWORD') },
    // Only read locally (the reassignment target search by id) — unused against staging.
    storeAId: -1,
    storeBId: -1,
  }
}
