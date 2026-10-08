/**
 * The agent's identity mark: a round avatar of the site's initials, built from the accent role (no
 * image file), optionally with the small "online" status dot. Purely decorative — the agent's name
 * is always written beside it — so it is hidden from assistive technology.
 */
import styles from './chat-agent.module.css'

/** Up to two initials from the first letters of a site name's words: "Indies Gallery" → "IG". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word !== '')
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? '')
    .join('')
}

export function ChatAvatar({
  name,
  size,
  online = false,
}: {
  readonly name: string
  readonly size: 'sm' | 'md'
  readonly online?: boolean
}): React.ReactElement {
  return (
    <span
      className={`${styles.avatar} ${size === 'md' ? styles.md : styles.sm}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
      {online && <span className={styles.online} />}
    </span>
  )
}
