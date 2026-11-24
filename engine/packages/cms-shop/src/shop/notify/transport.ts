/**
 * The notifier's mail transport (COMMERCE.md §11): SMTP from the environment (`SMTP_HOST`,
 * `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`), one transporter per
 * process. Staging and local point `SMTP_HOST` at Mailpit (`localhost:1025`, no auth); nothing
 * leaves. With no `SMTP_HOST`, mail is written to the console instead — the recipient and the
 * subject, never the body — as Payload's own mail does with none (`@engine/cms-core/config`), and
 * nothing tries a connection to a server nobody named (TASKS.md 24.2's carry-over, fixed in 28.1).
 * Tests inject a fake with `setMailTransport` and must call it again with `null` in `afterEach` so
 * the real transport returns for the next file.
 */
import nodemailer from 'nodemailer'

export type MailMessage = {
  readonly to: string
  readonly subject: string
  readonly text: string
  readonly html: string
}

export type MailTransport = {
  send(message: MailMessage): Promise<void>
}

type Env = Readonly<Record<string, string | undefined>>

function fromHeader(env: Env): string {
  const name = env.SMTP_FROM_NAME ?? 'Old East Indies'
  const address = env.SMTP_FROM_ADDRESS ?? 'no-reply@old-east-indies.gaiada.com'
  return `"${name}" <${address}>`
}

let smtp: MailTransport | null = null
let override: MailTransport | null = null

/** No SMTP server named: each message is logged (to and subject), and counts as sent. */
export function consoleTransport(log: (line: string) => void = console.info): MailTransport {
  return {
    async send(message) {
      log(`[notify] SMTP_HOST is not set: mail not sent — to ${message.to}: ${message.subject}`)
    },
  }
}

/** The transport `env` names: SMTP when it names a host, the console otherwise. */
export function buildMailTransport(env: Env = process.env): MailTransport {
  const host = env.SMTP_HOST?.trim()
  if (!host) return consoleTransport()
  const transporter = nodemailer.createTransport({
    host,
    port: Number(env.SMTP_PORT?.trim() || '1025'),
    secure: false,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
  })
  return {
    async send(message) {
      await transporter.sendMail({ from: fromHeader(env), ...message })
    },
  }
}

/** The transport every call sends through: a test's fake, or the one built from the environment. */
export function mailTransport(): MailTransport {
  if (override !== null) return override
  smtp ??= buildMailTransport()
  return smtp
}

/** Tests only: swaps the transport; `null` restores the real one. */
export function setMailTransport(transport: MailTransport | null): void {
  override = transport
}
