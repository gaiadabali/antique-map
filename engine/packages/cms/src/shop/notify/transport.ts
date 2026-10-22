/**
 * The notifier's mail transport (COMMERCE.md §11): SMTP from the environment (`SMTP_HOST`,
 * `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`), one transporter per
 * process. Staging and local point `SMTP_HOST` at Mailpit (`localhost:1025`, no auth); nothing
 * leaves. Tests inject a fake with `setMailTransport` and must call it again with `null` in
 * `afterEach` so the real transport returns for the next file.
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

function fromHeader(): string {
  const name = process.env.SMTP_FROM_NAME ?? 'Old East Indies'
  const address = process.env.SMTP_FROM_ADDRESS ?? 'no-reply@old-east-indies.gaiada.com'
  return `"${name}" <${address}>`
}

let smtp: MailTransport | null = null
let override: MailTransport | null = null

function buildSmtpTransport(): MailTransport {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? '1025'),
    secure: false,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } }
      : {}),
  })
  return {
    async send(message) {
      await transporter.sendMail({ from: fromHeader(), ...message })
    },
  }
}

/** The transport every call sends through: a test's fake, or the one SMTP transporter. */
export function mailTransport(): MailTransport {
  if (override !== null) return override
  smtp ??= buildSmtpTransport()
  return smtp
}

/** Tests only: swaps the transport; `null` restores the real one. */
export function setMailTransport(transport: MailTransport | null): void {
  override = transport
}
