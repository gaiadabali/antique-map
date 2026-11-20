import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { evalModels, liveModel } from './live-model'

describe('live mode configuration', () => {
  it('refuses without a key', () => {
    expect(liveModel({})).toBeNull()
    expect(liveModel({ ANTHROPIC_API_KEY: '   ' })).toBeNull()
  })

  it('builds a client with a key, with or without a base URL', () => {
    expect(liveModel({ ANTHROPIC_API_KEY: 'k-test' })).not.toBeNull()
    expect(
      liveModel({ ANTHROPIC_API_KEY: 'k-test', ANTHROPIC_BASE_URL: 'https://openrouter.ai/api' }),
    ).not.toBeNull()
  })

  it('AI_EVAL_MODEL answers and classifies', () => {
    const m = evalModels({ AI_EVAL_MODEL: 'z-ai/glm-5.3-flash', AI_CHAT_MODEL: 'claude-opus-x1' })
    expect(m.chat).toBe('z-ai/glm-5.3-flash')
    expect(m.classify).toBe('z-ai/glm-5.3-flash')
  })

  it('AI_EVAL_CLASSIFY_MODEL overrides the classifier only', () => {
    const m = evalModels({ AI_EVAL_MODEL: 'glm-a', AI_EVAL_CLASSIFY_MODEL: 'glm-b' })
    expect([m.chat, m.classify]).toEqual(['glm-a', 'glm-b'])
  })

  it('falls back to the chat model env, then the defaults', () => {
    expect(evalModels({ AI_CHAT_MODEL: 'claude-custom-9' }).chat).toBe('claude-custom-9')
    expect(evalModels({}).chat).toBe('claude-sonnet-5-5')
  })
})
