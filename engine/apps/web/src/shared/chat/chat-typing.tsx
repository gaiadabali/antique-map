/**
 * Three dots while the assistant has not yet produced any text. The dots are decorative; the
 * visually hidden line says it in words for a screen reader (the thread is a polite live region).
 */
import styles from './chat-typing.module.css'

export function ChatTyping({ label }: { readonly label: string }): React.ReactElement {
  return (
    <p className={styles.typing} data-chat-role="typing">
      <span className={styles.label}>{label}</span>
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </p>
  )
}
