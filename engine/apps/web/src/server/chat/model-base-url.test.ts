/** Staging runs the chat on an Anthropic-compatible endpoint (OpenRouter) while OA8 is pending. */
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { modelBaseUrl } = await import('./env')

describe('modelBaseUrl', () => {
  it('is unset when ANTHROPIC_BASE_URL is unset or blank, so production uses the default', () => {
    expect(modelBaseUrl({})).toBeUndefined()
    expect(modelBaseUrl({ ANTHROPIC_BASE_URL: '  ' })).toBeUndefined()
  })

  it('takes an https endpoint', () => {
    expect(modelBaseUrl({ ANTHROPIC_BASE_URL: 'https://openrouter.ai/api' })).toBe(
      'https://openrouter.ai/api',
    )
  })

  it('ignores plain http, credentials in the URL and garbage', () => {
    expect(modelBaseUrl({ ANTHROPIC_BASE_URL: 'http://openrouter.ai/api' })).toBeUndefined()
    expect(modelBaseUrl({ ANTHROPIC_BASE_URL: 'https://u:p@openrouter.ai/api' })).toBeUndefined()
    expect(modelBaseUrl({ ANTHROPIC_BASE_URL: 'not a url' })).toBeUndefined()
  })
})
