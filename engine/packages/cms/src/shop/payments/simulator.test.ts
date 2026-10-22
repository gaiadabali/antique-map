/**
 * The simulator (SECURITY.md W7): no credential, notifications signed so the real webhook path
 * accepts them, its status API answering what it last emitted — and production refused, at
 * creation and on every call.
 */
import { describe, expect, it } from 'vitest'

import { createPaymentProvider } from './create-provider'
import { readSignedFields } from './notification'
import { SANDBOX, SIMULATE } from './payments.test-support'
import { isValidSignature } from './signature'
import { simulatorProvider } from './simulator'

const request = {
  midtransOrderId: '7001-1',
  grossAmount: 205000,
  items: [],
  customer: { name: 'B', email: 'b@example.test', phone: '+62812' },
  expiresAt: new Date(Date.now() + 3_600_000),
  now: new Date(),
}

describe('the payment simulator', () => {
  it('is what simulate mode selects, and Snap otherwise', () => {
    expect(createPaymentProvider(SIMULATE).mode).toBe('simulate')
    expect(createPaymentProvider(SANDBOX).mode).toBe('sandbox')
  })

  it('emits notifications signed with its key, which the webhook’s check accepts', async () => {
    const simulator = simulatorProvider(SIMULATE)
    const created = await simulator.createPayment(request)
    expect(created.redirectUrl).toBe('/pay/simulate?attempt=7001-1')
    const { body, payload } = simulator.emit('7001-1', 'settle')
    expect(payload).toMatchObject({
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '205000.00',
    })
    const read = readSignedFields(body)
    if (!read.ok) throw new Error('unreadable')
    expect(isValidSignature(read.fields, read.signatureKey, SIMULATE.serverKey)).toBe(true)
    expect(isValidSignature(read.fields, read.signatureKey, SANDBOX.serverKey)).toBe(false)
  })

  it('answers its status API with what it last emitted, and not found before', async () => {
    const simulator = simulatorProvider(SIMULATE)
    simulator.register('7002-1', 99000)
    expect(await simulator.getStatus('7002-1')).toEqual({ found: false })
    simulator.emit('7002-1', 'pending')
    expect(await simulator.getStatus('7002-1')).toMatchObject({
      found: true,
      status: { transactionStatus: 'pending', grossAmount: 99000 },
    })
    simulator.emit('7002-1', 'settle', { grossAmount: 1 })
    expect(await simulator.getStatus('7002-1')).toMatchObject({ status: { grossAmount: 1 } })
    // One transaction per attempt: the same id across its states.
    const first = simulator.emit('7002-1', 'pending').payload.transaction_id
    expect(simulator.emit('7002-1', 'settle').payload.transaction_id).toBe(first)
  })

  it('shares one store across instances in the process', async () => {
    simulatorProvider(SIMULATE).register('7003-1', 5000)
    expect(() => simulatorProvider(SIMULATE).emit('7003-1', 'deny')).not.toThrow()
    expect(() => simulatorProvider(SIMULATE).emit('7999-1', 'deny')).toThrow(/no attempt/)
  })

  it('is refused in production — at creation, and on every call of one made before', async () => {
    const production = { ...SIMULATE, environment: 'production' as const }
    expect(() => simulatorProvider(production)).toThrow(/refused/)
    expect(() => createPaymentProvider(production)).toThrow(/refused/)
    // A config object mutated after creation is still caught at call time.
    const config = { ...SIMULATE }
    const simulator = simulatorProvider(config)
    simulator.register('7004-1', 5000)
    Object.assign(config, { environment: 'production' })
    expect(() => simulator.emit('7004-1', 'settle')).toThrow(/refused/)
    await expect(simulator.getStatus('7004-1')).rejects.toThrow(/refused/)
    await expect(
      simulator.createPayment({ ...request, midtransOrderId: '7004-2' }),
    ).rejects.toThrow(/refused/)
  })
})
