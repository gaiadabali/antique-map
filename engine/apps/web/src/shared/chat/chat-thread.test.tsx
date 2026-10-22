import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ChatComposer, handleComposerKeyDown } from './chat-composer'
import { ChatHeader } from './chat-header'
import { INITIAL_CHAT_STATE, type ChatState } from './chat-reducer'
import { ChatSuggestions } from './chat-suggestions'
import { ChatThread } from './chat-thread'
import { chatPanelText } from './lexicon'
import type { ChatContact } from './types'

const text = chatPanelText('en', 'gallery')
const origin = 'https://gallery.example.com'
const contact: ChatContact = { whatsappHref: 'https://wa.me/6281234567890', emailHref: null }
const noop = (): void => undefined

function thread(state: ChatState, extra: { pageTitle?: string | null; notices?: string[] } = {}) {
  return renderToStaticMarkup(
    <ChatThread
      text={text}
      site="gallery"
      locale="en"
      origin={origin}
      state={state}
      contact={contact}
      pageTitle={extra.pageTitle ?? null}
      suggestions={['What maps do you have of Java?']}
      canPick
      notices={extra.notices ?? []}
      onPick={noop}
      onOpenLead={noop}
      onCancelLead={noop}
      onLeadSubmitted={noop}
    />,
  )
}

/** Every element in a React tree whose type is the string `tag`, found without a DOM. */
function elementsOf(node: ReactNode, tag: string): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => elementsOf(child, tag))
  if (node === null || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<{ children?: ReactNode }>
  const own = element.type === tag ? [element as ReactElement<Record<string, unknown>>] : []
  return [...own, ...elementsOf(element.props.children, tag)]
}

describe('the thread', () => {
  it('opens with the agent greeting and the suggestions', () => {
    const markup = thread(INITIAL_CHAT_STATE)
    expect(markup).toContain('data-chat-role="greeting"')
    expect(markup).toContain('the Indies Gallery assistant')
    expect(markup).toContain('What maps do you have of Java?')
  })

  it('names the item in the greeting when opened from its page', () => {
    expect(thread(INITIAL_CHAT_STATE, { pageTitle: 'Map of Java, 1635' })).toContain(
      '“Map of Java, 1635”',
    )
  })

  it('shows the typing indicator while streaming before any text arrives', () => {
    const waiting: ChatState = {
      ...INITIAL_CHAT_STATE,
      streaming: true,
      entries: [{ kind: 'user', text: 'Hello' }],
    }
    expect(thread(waiting)).toContain('data-chat-role="typing"')
    expect(thread(waiting)).toContain(text.typing)
  })

  it('drops the typing indicator once the reply text is streaming, and when idle', () => {
    const replying: ChatState = {
      ...INITIAL_CHAT_STATE,
      streaming: true,
      entries: [
        { kind: 'user', text: 'Hello' },
        { kind: 'assistant', text: 'Hi, ' },
      ],
    }
    expect(thread(replying)).not.toContain('data-chat-role="typing"')
    expect(thread(INITIAL_CHAT_STATE)).not.toContain('data-chat-role="typing"')
  })

  it('shows an error as a soft notice with the handoff, WhatsApp as the primary action', () => {
    const markup = thread(INITIAL_CHAT_STATE, { notices: ['Too many messages. Try again in 30s.'] })
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('Too many messages. Try again in 30s.')
    expect(markup).toContain('https://wa.me/6281234567890')
    expect(markup).toContain(text.handoffWhatsapp)
    expect(markup).not.toContain('mailto:')
  })
})

describe('the suggestion chips', () => {
  it('send the suggestion at once when chosen', () => {
    const picked: string[] = []
    const tree = ChatSuggestions({
      label: text.suggestionsLabel,
      suggestions: ['One?', 'Two?'],
      disabled: false,
      onPick: (suggestion) => picked.push(suggestion),
    })
    const buttons = elementsOf(tree, 'button')
    expect(buttons).toHaveLength(2)
    const second = buttons[1]?.props.onClick as () => void
    second()
    expect(picked).toEqual(['Two?'])
  })

  it('are disabled until the session is ready', () => {
    const markup = renderToStaticMarkup(
      <ChatSuggestions label="Suggested" suggestions={['One?']} disabled onPick={noop} />,
    )
    expect(markup).toMatch(/<button[^>]*disabled/)
  })
})

describe('the composer', () => {
  const keyEvent = (key: string, shiftKey = false) => ({
    nativeEvent: { key, shiftKey },
    preventDefault: vi.fn(),
  })

  it('sends on Enter and keeps the newline out of the textarea', () => {
    const send = vi.fn()
    const event = keyEvent('Enter')
    handleComposerKeyDown(event, send)
    expect(send).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('starts a new line on Shift+Enter', () => {
    const send = vi.fn()
    const event = keyEvent('Enter', true)
    handleComposerKeyDown(event, send)
    expect(send).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('keeps the accessible label and the lexicon names on its buttons', () => {
    const props = {
      text,
      value: '',
      maxChars: 1000,
      canSend: false,
      disabled: false,
      textareaRef: { current: null },
      onChange: noop,
      onSend: noop,
      onStop: noop,
    }
    const idle = renderToStaticMarkup(<ChatComposer {...props} streaming={false} />)
    expect(idle).toContain(`>${text.composerLabel}</label>`)
    expect(idle).toContain(`aria-label="${text.send}"`)
    const streaming = renderToStaticMarkup(<ChatComposer {...props} streaming />)
    expect(streaming).toContain(`aria-label="${text.stop}"`)
    expect(streaming).not.toContain(`aria-label="${text.send}"`)
  })
})

describe('the header', () => {
  it('names the agent and links "Talk to a person" to the site contact', () => {
    const markup = renderToStaticMarkup(
      <ChatHeader
        text={text}
        talk={{ href: 'https://wa.me/6281234567890', external: true }}
        onClose={noop}
      />,
    )
    expect(markup).toContain('>Indies Gallery</h2>')
    expect(markup).toContain(text.agentStatus)
    expect(markup).toContain('href="https://wa.me/6281234567890"')
    expect(markup).toContain(text.talkToPerson)
    expect(markup).toContain(`aria-label="${text.close}"`)
  })

  it('omits the action when the site has no contact link', () => {
    const markup = renderToStaticMarkup(<ChatHeader text={text} talk={null} onClose={noop} />)
    expect(markup).not.toContain(text.talkToPerson)
  })
})
