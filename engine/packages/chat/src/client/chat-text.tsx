/**
 * The assistant's text as the small Markdown subset AI.md §2.2 allows: paragraphs, bulleted or
 * numbered lists and **bold**. Everything else stays literal text — React escapes it, and no
 * HTML is ever parsed. Links are not rendered: the model writes none (the prompt and the output
 * check, AI.md §3.3), and contact buttons come from the server as their own events.
 */
import type { ReactNode } from 'react'

const BOLD = /\*\*([^*\n]+)\*\*/g
const ITEM = /^\s*(?:[-*•]|\d{1,2}[.)])\s+/

/** `**bold**` as <strong>; any other asterisk stays as typed. */
export function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(BOLD)) {
    const at = match.index ?? 0
    if (at > last) parts.push(text.slice(last, at))
    parts.push(<strong key={at}>{match[1]}</strong>)
    last = at + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

type Block =
  | { readonly kind: 'p'; readonly lines: string[] }
  | { readonly kind: 'ul' | 'ol'; readonly items: string[] }

/** Blank lines separate paragraphs; a run of "- " or "1. " lines is a list. */
export function blocksOf(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const last = blocks.at(-1)
    if (line.trim() === '') {
      if (last && !(last.kind === 'p' && last.lines.length === 0))
        blocks.push({ kind: 'p', lines: [] })
      continue
    }
    if (ITEM.test(line)) {
      const kind = /^\s*\d/.test(line) ? 'ol' : 'ul'
      const item = line.replace(ITEM, '')
      if (last && last.kind === kind) last.items.push(item)
      else blocks.push({ kind, items: [item] })
      continue
    }
    if (last && last.kind === 'p') last.lines.push(line)
    else blocks.push({ kind: 'p', lines: [line] })
  }
  return blocks.filter((block) => block.kind !== 'p' || block.lines.length > 0)
}

export function ChatText({ text }: { readonly text: string }): React.ReactElement {
  return (
    <>
      {blocksOf(text).map((block, index) =>
        block.kind === 'p' ? (
          <p key={index}>{inline(block.lines.join('\n'))}</p>
        ) : block.kind === 'ul' ? (
          <ul key={index}>
            {block.items.map((item, at) => (
              <li key={at}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <ol key={index}>
            {block.items.map((item, at) => (
              <li key={at}>{inline(item)}</li>
            ))}
          </ol>
        ),
      )}
    </>
  )
}
