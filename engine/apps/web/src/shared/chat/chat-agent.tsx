/**
 * The agent's identity mark: a round avatar of the site's initials (or a drawn icon in their place,
 * the shop's chat), built from the accent role (no image file), optionally with the small "online"
 * status dot. Purely decorative — the agent's name
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
  icon,
  className,
}: {
  readonly name: string
  readonly size: 'sm' | 'md'
  readonly online?: boolean
  /** Drawn in place of the initials. */
  readonly icon?: React.ReactNode
  readonly className?: string
}): React.ReactElement {
  return (
    <span
      className={`${styles.avatar} ${size === 'md' ? styles.md : styles.sm} ${className ?? ''}`}
      aria-hidden="true"
    >
      {icon ?? initialsOf(name)}
      {online && <span className={styles.online} />}
    </span>
  )
}
