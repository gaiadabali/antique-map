/**
 * Which payment provider a process talks to, read from its environment at call time (COMMERCE.md
 * §6 "Environments"; DEPLOYMENT.md §7–§8; SECURITY.md W7):
 *
 * - `MIDTRANS_MODE=simulate` — no Midtrans at all: notifications are signed with
 *   `SIMULATOR_SERVER_KEY`, a fixed local value that is not a secret. **Refused in production**,
 *   every time a config is read, so a production process can never sign or accept a simulated
 *   payment even if its boot check was skipped.
 * - `MIDTRANS_MODE=sandbox` — `SB-Mid-server-…` / `SB-Mid-client-…` keys, off production only.
 * - `MIDTRANS_MODE=production` — live `Mid-server-…` / `Mid-client-…` keys, production only.
 * - unset — the mode the server key's prefix names (DEPLOYMENT.md §8: "unset, Midtrans runs on the
 *   keys below"), held to the same rules.
 *
 * The environment is the boot check's own judgement (`deploymentEnvironment`, from the canonical
 * hosts, failing closed to production) — never `NODE_ENV`, since staging runs production builds.
 * A refusal is a value naming the variable and the fix; it never carries a key's value.
 */
import { deploymentEnvironment, type DeploymentEnvironment } from '@engine/config/boot-check'

export const MIDTRANS_MODES = ['simulate', 'sandbox', 'production'] as const
export type MidtransMode = (typeof MIDTRANS_MODES)[number]

/**
 * The simulator's signing key. Public on purpose: it only ever signs simulated notifications, and
 * a process holding it as its key is in simulate mode, which production refuses.
 */
export const SIMULATOR_SERVER_KEY = 'SIM-Mid-server-indies-local-simulator'

const SANDBOX_SERVER = 'SB-Mid-server-'
const SANDBOX_CLIENT = 'SB-Mid-client-'
const LIVE_SERVER = 'Mid-server-'
const LIVE_CLIENT = 'Mid-client-'

/** Midtrans's hosts per mode: Snap (`app.`) and the Core/status API (`api.`). */
export const MIDTRANS_HOSTS = {
  sandbox: { snap: 'https://app.sandbox.midtrans.com', api: 'https://api.sandbox.midtrans.com' },
  production: { snap: 'https://app.midtrans.com', api: 'https://api.midtrans.com' },
} as const

export type PaymentsConfig = {
  readonly mode: MidtransMode
  readonly environment: DeploymentEnvironment
  /** Signs and verifies notifications; authenticates API calls. Never logged. */
  readonly serverKey: string
  /** The browser's Snap key (a server-rendered prop on the pay step); null in simulate mode. */
  readonly clientKey: string | null
}

export type PaymentsConfigResult =
  | { readonly ok: true; readonly config: PaymentsConfig }
  | { readonly ok: false; readonly subject: string; readonly reason: string }

type Env = Readonly<Record<string, string | undefined>>

const read = (env: Env, name: string) => {
  const value = env[name]?.trim()
  return value ? value : undefined
}

/** The environment as the boot check judges it; its findings are the boot check's to report. */
export function judgedEnvironment(env: Env): DeploymentEnvironment {
  const ignore = () => {}
  return deploymentEnvironment(env, {
    problems: [],
    warnings: [],
    refuse: ignore,
    warn: ignore,
    require: ignore,
  })
}

const refuse = (subject: string, reason: string): PaymentsConfigResult => ({
  ok: false,
  subject,
  reason,
})

/** Reads and checks the payment settings; `environment` overrides the judgement (tests only). */
export function paymentsConfigFromEnv(
  env: Env = process.env,
  environment: DeploymentEnvironment = judgedEnvironment(env),
): PaymentsConfigResult {
  const declared = read(env, 'MIDTRANS_MODE')
  if (declared !== undefined && !(MIDTRANS_MODES as readonly string[]).includes(declared)) {
    return refuse('MIDTRANS_MODE', `is "${declared}"; use simulate, sandbox or production`)
  }
  if (declared === 'simulate') {
    if (environment === 'production') {
      return refuse('MIDTRANS_MODE', 'is "simulate", which production refuses: unset it')
    }
    return {
      ok: true,
      config: { mode: 'simulate', environment, serverKey: SIMULATOR_SERVER_KEY, clientKey: null },
    }
  }
  const serverKey = read(env, 'MIDTRANS_SERVER_KEY')
  const clientKey = read(env, 'MIDTRANS_CLIENT_KEY')
  if (!serverKey)
    return refuse(
      'MIDTRANS_SERVER_KEY',
      'is missing (or set MIDTRANS_MODE=simulate off production)',
    )
  if (!clientKey) return refuse('MIDTRANS_CLIENT_KEY', 'is missing')
  const keyMode: MidtransMode | null = serverKey.startsWith(SANDBOX_SERVER)
    ? 'sandbox'
    : serverKey.startsWith(LIVE_SERVER)
      ? 'production'
      : null
  if (keyMode === null) {
    return refuse(
      'MIDTRANS_SERVER_KEY',
      `is not a Midtrans server key (${SANDBOX_SERVER}… or ${LIVE_SERVER}…)`,
    )
  }
  const mode = (declared as MidtransMode | undefined) ?? keyMode
  if (mode !== keyMode) {
    return refuse('MIDTRANS_SERVER_KEY', `is a ${keyMode} key, but MIDTRANS_MODE is "${mode}"`)
  }
  const clientPrefix = mode === 'sandbox' ? SANDBOX_CLIENT : LIVE_CLIENT
  if (!clientKey.startsWith(clientPrefix)) {
    return refuse('MIDTRANS_CLIENT_KEY', `is not a ${mode} client key (${clientPrefix}…)`)
  }
  if (mode === 'sandbox' && environment === 'production') {
    return refuse('MIDTRANS_SERVER_KEY', 'is a sandbox key, which production refuses')
  }
  if (mode === 'production' && environment !== 'production') {
    return refuse(
      'MIDTRANS_SERVER_KEY',
      `is a live key, which ${environment} refuses: use the sandbox keys`,
    )
  }
  return { ok: true, config: { mode, environment, serverKey, clientKey } }
}

/** Throws a defect when a simulator is about to run in production: the call-time guard. */
export function assertSimulatorAllowed(config: PaymentsConfig): void {
  if (config.mode !== 'simulate' || config.environment === 'production') {
    throw new Error(
      'payments: the Midtrans simulator is refused here (production, or not simulate mode)',
    )
  }
}
