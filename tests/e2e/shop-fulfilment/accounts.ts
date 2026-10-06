/**
 * The shop fulfilment gate's accounts (TASKS.md 7.4.a). Locally (`GATE_DB=local`) the spec makes
 * its own owner/editor/store accounts — the same `../admin/accounts.ts` four — through `./ops.ts`'s
 * own `accounts` op (7.4-r2; `./run-ops.ts`'s `runOps`), not `../admin/local.mjs`'s `fixtures()`:
 * that script also creates vocabulary rows whose cache-invalidation hook needs a Next request
 * (`./ops.ts`'s header), which a plain `payload run` never is. Against staging the orchestrator
 * supplies real accounts by environment variable instead; nothing here creates anything in that
 * case.
 */
import { ACCOUNTS, PASSWORD as LOCAL_PASSWORD } from '../admin/accounts'
import { envVar, GATE_DB } from './env'
import { runOps } from './run-ops'

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

type AccountsResult = {
  readonly stores: { readonly a: { readonly id: number }; readonly b: { readonly id: number } }
}

let cached: GateAccounts | null = null

/**
 * The four accounts and the two fixture stores' ids — made locally, given on staging. Memoized:
 * `GATE_DB=local` shells out to `ops.ts` (idempotent but a whole `payload run`), and callers like
 * `quoteAsStaff` (`./helpers.ts`) ask for this once per order.
 */
export function gateAccounts(): GateAccounts {
  if (cached) return cached
  if (GATE_DB) {
    const made = runOps({ op: 'accounts' }) as AccountsResult
    cached = {
      owner: { email: ACCOUNTS.owner.email, password: LOCAL_PASSWORD },
      storeA: { email: ACCOUNTS.storeA.email, password: LOCAL_PASSWORD },
      storeB: { email: ACCOUNTS.storeB.email, password: LOCAL_PASSWORD },
      storeAId: made.stores.a.id,
      storeBId: made.stores.b.id,
    }
    return cached
  }
  cached = {
    owner: { email: required('E2E_OWNER_EMAIL'), password: required('E2E_OWNER_PASSWORD') },
    storeA: { email: required('E2E_STORE_A_EMAIL'), password: required('E2E_STORE_A_PASSWORD') },
    storeB: { email: required('E2E_STORE_B_EMAIL'), password: required('E2E_STORE_B_PASSWORD') },
    // Only read locally (the reassignment target search by id) — unused against staging.
    storeAId: -1,
    storeBId: -1,
  }
  return cached
}
