import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChatText } from './chat-text'

const html = (text: string) => renderToStaticMarkup(<ChatText text={text} />)

describe('the assistant text subset', () => {
  it('renders **bold** as strong and leaves a lone asterisk as typed', () => {
    expect(html('This is **Abhimanjoe** (P.1180), 5 * 3 cm.')).toBe(
      '<p>This is <strong>Abhimanjoe</strong> (P.1180), 5 * 3 cm.</p>',
    )
  })

  it('splits paragraphs on blank lines and makes lists from "- " and "1. " lines', () => {
    expect(html('Two maps:\n\n- **Java**, 1726\n- Bali\n\n1. First\n2. Second\n\nThanks.')).toBe(
      '<p>Two maps:</p><ul><li><strong>Java</strong>, 1726</li><li>Bali</li></ul>' +
        '<ol><li>First</li><li>Second</li></ol><p>Thanks.</p>',
    )
  })

  it('never parses HTML: tags stay text', () => {
    expect(html('<img src=x onerror=alert(1)> **hi**')).toBe(
      '<p>&lt;img src=x onerror=alert(1)&gt; <strong>hi</strong></p>',
    )
  })
})
