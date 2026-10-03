/**
 * The real SDK adapter, driven end to end against a local stand-in of the Messages API (no key,
 * no network): the official `@anthropic-ai/sdk` parses the server-sent events, the tool loop runs
 * a real `tool_use`, and a blocked sentence aborts the upstream request mid-stream without an
 * unhandled rejection (which would take the process down).
 */
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type Anthropic from '@anthropic-ai/sdk'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { postMessage } from '../http/message'
import { startSession } from '../http/session'
import { eventsOf as messageEvents, message, type ScriptedReply } from '../test-support/fake-model'
import {
  chatRequest,
  cookieOf,
  eventsOf,
  harness,
  stubSiteEnv,
  textOf,
} from '../test-support/harness'
import { anthropicClient } from './anthropic'

let server: Server
let baseURL = ''
let replies: ScriptedReply[] = []
const requests: Array<{
  path: string
  headers: IncomingMessage['headers']
  body: Anthropic.MessageCreateParams
}> = []
let closedEarly = 0

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => (raw += chunk.toString()))
    req.on('end', async () => {
      const body = JSON.parse(raw) as Anthropic.MessageCreateParams
      requests.push({ path: req.url ?? '', headers: req.headers, body })
      if (!body.stream) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(message({ text: '{"label":"browse"}' }, body.model, 0)))
        return
      }
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.on('close', () => {
        if (!res.writableEnded) closedEarly += 1
      })
      const reply = replies.shift() ?? { text: 'ok' }
      for (const event of messageEvents(message(reply, body.model, requests.length))) {
        if (res.destroyed) return
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
        await new Promise((resolve) => setTimeout(resolve, 2))
      }
      res.end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))
beforeEach(() => {
  stubSiteEnv()
  requests.length = 0
  closedEarly = 0
})
afterEach(() => vi.unstubAllEnvs())

async function turn(text: string) {
  const h = harness(() => ({ text: 'unused' }))
  const deps = { ...h.deps, model: anthropicClient('sk-ant-test-0000000000000000', baseURL) }
  const opened = await startSession(
    chatRequest('gallery', '/api/x/chat/session', { body: { turnstileToken: 't', locale: 'en' } }),
    deps,
  )
  h.tick()
  const response = await postMessage(
    chatRequest('gallery', '/api/x/chat/message', {
      cookie: cookieOf(opened),
      body: { text, locale: 'en' },
    }),
    deps,
  )
  return { h, events: await eventsOf(response) }
}

describe('the Anthropic adapter', () => {
  it('streams a tool round and an answer through the real SDK', async () => {
    replies = [
      { tools: [{ name: 'get_item', input: { id: '1726' } }] },
      { text: 'This is Bali by François Valentijn, 1726. It is listed as available.' },
    ]
    const { h, events } = await turn('Tell me about the Bali map')
    expect(textOf(events)).toBe(
      'This is Bali by François Valentijn, 1726. It is listed as available.',
    )
    expect(events.some((e) => e.type === 'card' && e.id === '1726')).toBe(true)
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'answered' })
    const answers = requests.filter((r) => r.body.stream)
    expect(answers).toHaveLength(2)
    expect(answers[0]?.path).toBe('/v1/messages')
    expect(answers[0]?.headers['x-api-key']).toBe('sk-ant-test-0000000000000000')
    expect(answers[0]?.body).toMatchObject({
      model: 'claude-sonnet-5-5',
      tool_choice: { type: 'auto' },
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low' },
    })
    expect(JSON.stringify(answers[1]?.body.messages)).toContain('<catalogue_data>')
    // Usage from the stream's events reached the session: two answer calls and the classifier.
    expect([...h.store.sessions.values()][0]?.usage.costUsd).toBeGreaterThan(0)
  })

  it('aborts the upstream request at a blocked sentence, without an unhandled rejection', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    replies = [
      {
        text:
          'A fine chart. Its price is USD 4,500. '.padEnd(40) +
          'More text that must never be generated. '.repeat(40),
      },
    ]
    const { events } = await turn('Price?')
    await new Promise((resolve) => setTimeout(resolve, 50))
    process.off('unhandledRejection', unhandled)
    expect(textOf(events)).not.toMatch(/USD|4,500|never be generated/)
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'blocked' })
    expect(closedEarly).toBe(1)
    expect(unhandled).not.toHaveBeenCalled()
  })
})
