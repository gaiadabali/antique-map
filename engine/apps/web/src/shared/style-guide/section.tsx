import styles from './style-guide.module.css'

export function Section({
  children,
  id,
  note,
  title,
}: {
  children: React.ReactNode
  id: string
  note?: string
  title: string
}): React.ReactElement {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 className={styles.sectionTitle} id={id}>
        {title}
      </h2>
      {note ? <p className={styles.note}>{note}</p> : null}
      {children}
    </section>
  )
}
