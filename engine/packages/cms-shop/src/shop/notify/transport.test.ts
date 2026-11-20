/**
 * The notifier's transport with no SMTP server named (TASKS.md 28.1, 24.2's carry-over): the
 * message is logged — recipient and subject, not the body — and no connection is tried.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildMailTransport, consoleTransport } from './transport'

const message = {
  to: 'buyer@example.test',
  subject: 'Your order OEI-1',
  text: 'the body, with the address',
  html: '<p>the body, with the address</p>',
}

describe('the mail transport without SMTP_HOST', () => {
  afterEach(() => vi.restoreAllMocks())

  it('logs the recipient and the subject, and never the body', async () => {
    const lines: string[] = []
    await consoleTransport((line) => lines.push(line)).send(message)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('buyer@example.test')
    expect(lines[0]).toContain('Your order OEI-1')
    expect(lines[0]).not.toContain('the body')
  })

  it('writes to the console when SMTP_HOST is unset or blank', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    for (const env of [{}, { SMTP_HOST: '  ' }]) {
      await expect(buildMailTransport(env).send(message)).resolves.toBeUndefined()
    }
    expect(info).toHaveBeenCalledTimes(2)
    expect(String(info.mock.calls[0]?.[0])).toMatch(/SMTP_HOST is not set/)
  })
})
