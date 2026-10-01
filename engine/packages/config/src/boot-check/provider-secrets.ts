/**
 * Every configured provider's secrets, per seller for payments and shipping, per brand for
 * fulfilment (DEPLOYMENT.md §8, PAYMENTS.md §8): `PAYMENT_<SELLER>_<PROVIDER>_<NAME>`,
 * `SHIPPING_<SELLER>_<PROVIDER>_<NAME>`, `FULFILMENT_<PROVIDER>_<NAME>` — seller and provider
 * ids upper-cased, `-` as `_` (`PAYMENT_ID_BANK_TRANSFER_…`). A seller needs the secrets of its
 * own payment providers and its own couriers (`sellers[].shipping`, the brand's when it names
 * none) and no other: a Singapore seller shipping by DHL Express needs no Indonesian courier's.
 *
 * Sandbox vs live: where a provider's keys say which they are, the key itself is read
 * (Stripe `sk_test_`/`sk_live_`, Midtrans `SB-Mid-…`/`Mid-…`, Xendit
 * `xnd_development_`/`xnd_production_`); where they do not, `<PREFIX>_MODE` says it,
 * `sandbox` or `live`. Production runs on live keys; staging and local on sandbox keys, and a
 * live key there is refused too (DEPLOYMENT.md §8). A missing secret refuses a deployed process
 * and only warns on a workstation — absent sandbox credentials are a setup state; present and
 * refused ones are a defect wherever they are (CONVENTIONS.md §8). Until the client hands over a
 * provider's sandbox account, staging may set `<PREFIX>_MODE=simulate` instead: no credential is
 * read, the report warns, and production refuses it (owner, 2026-10-01).
 *
 * The names are the ones the adapters read (PAY, LOG): an adapter that needs another secret
 * adds it here in the same change.
 */
import type {
  BrandConfig,
  FulfilmentProviderId,
  PaymentProviderId,
  ShippingProviderId,
} from '../schema'
import { read, type DeploymentEnvironment, type Findings } from './findings'

type Mode = 'sandbox' | 'live'
/** A provider's `<PREFIX>_MODE` that stands in for its credentials outside production. */
export const SIMULATE = 'simulate'
type Secret = {
  readonly name: string
  /** The mode a value declares, `null` when it is not this provider's key at all. */
  readonly mode?: (value: string) => Mode | null
  /** A shape the value must have, when it declares no mode. */
  readonly shape?: RegExp
  readonly what: string
}
/** `modeVariable`: the keys cannot tell sandbox from live, so `<PREFIX>_MODE` does. */
type ProviderSecrets = { readonly secrets: readonly Secret[]; readonly modeVariable?: true }

const byPrefix =
  (sandbox: RegExp, live: RegExp) =>
  (value: string): Mode | null =>
    sandbox.test(value) ? 'sandbox' : live.test(value) ? 'live' : null
const NONE: ProviderSecrets = { secrets: [] }
const withMode = (...names: string[]): ProviderSecrets => ({
  secrets: names.map((name) => ({ name, what: 'a credential' })),
  modeVariable: true,
})

export const PAYMENT_SECRETS: Record<PaymentProviderId, ProviderSecrets> = {
  manual: NONE,
  'bank-transfer': NONE,
  stripe: {
    secrets: [
      {
        name: 'SECRET_KEY',
        mode: byPrefix(/^[sr]k_test_/, /^[sr]k_live_/),
        what: 'a Stripe secret key (sk_… or rk_…)',
      },
      {
        name: 'PUBLISHABLE_KEY',
        mode: byPrefix(/^pk_test_/, /^pk_live_/),
        what: 'a Stripe publishable key (pk_…)',
      },
      {
        name: 'WEBHOOK_SECRET',
        shape: /^whsec_/,
        what: 'a Stripe webhook signing secret (whsec_…)',
      },
    ],
  },
  midtrans: {
    secrets: [
      {
        name: 'SERVER_KEY',
        mode: byPrefix(/^SB-Mid-server-/, /^Mid-server-/),
        what: 'a Midtrans server key',
      },
      {
        name: 'CLIENT_KEY',
        mode: byPrefix(/^SB-Mid-client-/, /^Mid-client-/),
        what: 'a Midtrans client key',
      },
    ],
  },
  xendit: {
    secrets: [
      {
        name: 'SECRET_KEY',
        mode: byPrefix(/^xnd_development_/, /^xnd_production_/),
        what: 'a Xendit secret key (xnd_…)',
      },
      { name: 'WEBHOOK_TOKEN', what: 'a Xendit callback verification token' },
    ],
  },
  paypal: withMode('CLIENT_ID', 'CLIENT_SECRET', 'WEBHOOK_ID'),
  doku: withMode('CLIENT_ID', 'SECRET_KEY'),
}

export const SHIPPING_SECRETS: Record<ShippingProviderId, ProviderSecrets> = {
  flat: NONE,
  quote: NONE,
  collect: NONE,
  biteship: withMode('API_KEY', 'WEBHOOK_SECRET'),
  'dhl-express': withMode('API_KEY', 'API_SECRET', 'ACCOUNT_NUMBER'),
}

export const FULFILMENT_SECRETS: Record<FulfilmentProviderId, ProviderSecrets> = {
  'own-stock': NONE,
  'local-production': NONE,
  prodigi: withMode('API_KEY'),
  gelato: withMode('API_KEY'),
}

/** `PAYMENT`, `sg`, `bank-transfer` → `PAYMENT_SG_BANK_TRANSFER`. */
export function secretPrefix(
  kind: 'PAYMENT' | 'SHIPPING' | 'FULFILMENT',
  ...ids: string[]
): string {
  return [kind, ...ids].join('_').toUpperCase().replace(/-/g, '_')
}

type Env = Readonly<Record<string, string | undefined>>

export function checkProviderSecrets(
  env: Env,
  config: BrandConfig,
  environment: DeploymentEnvironment,
  findings: Findings,
): void {
  for (const seller of config.sellers) {
    for (const provider of new Set(seller.payments)) {
      const why = `seller "${seller.id}" takes payments by ${provider} (PAYMENTS.md §8)`
      check(
        env,
        secretPrefix('PAYMENT', seller.id, provider),
        PAYMENT_SECRETS[provider],
        why,
        environment,
        findings,
      )
    }
    for (const provider of new Set(seller.shipping.providers)) {
      const why = `seller "${seller.id}" ships by ${provider} (DEPLOYMENT.md §8)`
      check(
        env,
        secretPrefix('SHIPPING', seller.id, provider),
        SHIPPING_SECRETS[provider],
        why,
        environment,
        findings,
      )
    }
  }
  for (const provider of new Set(config.fulfilment.providers)) {
    const why = `the brand fulfils through ${provider} (DEPLOYMENT.md §8)`
    check(
      env,
      secretPrefix('FULFILMENT', provider),
      FULFILMENT_SECRETS[provider],
      why,
      environment,
      findings,
    )
  }
}

function check(
  env: Env,
  prefix: string,
  spec: ProviderSecrets,
  why: string,
  environment: DeploymentEnvironment,
  findings: Findings,
): void {
  if (spec.secrets.length === 0) return
  // `<PREFIX>_MODE=simulate`: the provider is simulated until the client hands over its sandbox
  // account (OA14) — no credential is read and nothing may reach the provider. Staging and local
  // only, and loud: production never simulates a payment or a courier.
  const modeName = `${prefix}_MODE`
  if (read(env, modeName) === SIMULATE) {
    if (environment === 'production') {
      findings.refuse(modeName, `is "${SIMULATE}": production runs on live keys (DEPLOYMENT.md §8)`)
    } else {
      findings.warn(
        modeName,
        `is "${SIMULATE}": ${why} is simulated — no credential, nothing reaches the provider, until its sandbox keys replace it (OA14)`,
      )
    }
    return
  }
  const expected: Mode = environment === 'production' ? 'live' : 'sandbox'
  const declared: { name: string; mode: Mode }[] = []
  for (const secret of spec.secrets) {
    const name = `${prefix}_${secret.name}`
    const value = read(env, name)
    if (value === undefined) {
      findings.require(name, `is not set: ${why}`, environment)
      continue
    }
    if (secret.shape && !secret.shape.test(value)) findings.refuse(name, `is not ${secret.what}`)
    if (secret.mode) {
      const mode = secret.mode(value)
      if (mode === null) findings.refuse(name, `is not ${secret.what}`)
      else declared.push({ name, mode })
    }
  }
  if (spec.modeVariable) {
    const name = `${prefix}_MODE`
    const value = read(env, name)
    if (value === undefined)
      findings.require(name, `is not set: "sandbox" or "live", for ${why}`, environment)
    else if (value !== 'sandbox' && value !== 'live')
      findings.refuse(name, `is "${value}"; it must be "sandbox" or "live"`)
    else declared.push({ name, mode: value })
  }
  const modes = new Set(declared.map((each) => each.mode))
  if (modes.size > 1) {
    const list = declared.map((each) => `${each.name} is ${each.mode}`).join(', ')
    findings.refuse(prefix, `mixes sandbox and live credentials (${list})`)
    return
  }
  for (const each of declared) {
    if (each.mode === expected) continue
    const rule =
      environment === 'production'
        ? 'production runs on live keys'
        : `${environment} runs on sandbox keys`
    findings.refuse(
      each.name,
      `is a ${each.mode} credential, but this is ${environment}: ${rule} (DEPLOYMENT.md §8)`,
    )
  }
}
