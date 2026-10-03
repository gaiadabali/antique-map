import { Badge, Card, Eyebrow, FormMessage, Hairline, Skeleton, Toast } from '../ui'

import { Section } from './section'
import styles from './style-guide.module.css'

export function Surfaces(): React.ReactElement {
  return (
    <>
      <Section id="sg-card" title="Card">
        <div className={styles.row}>
          <Card>Default card</Card>
          <Card tone="deep">Deep card</Card>
          <Card tone="dark">Dark card</Card>
        </div>
      </Section>

      <Section id="sg-badge" title="Badge">
        <div className={styles.row}>
          <Badge>Default</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="caution">Caution</Badge>
          <Badge tone="critical">Critical</Badge>
        </div>
      </Section>

      <Section id="sg-eyebrow" title="Eyebrow">
        <div className={styles.row}>
          <Eyebrow>Featured</Eyebrow>
        </div>
      </Section>

      <Section id="sg-hairline" title="Hairline">
        <div className={styles.row}>
          <Hairline direction="horizontal" strength="hair" />
          <Hairline direction="horizontal" strength="strong" />
        </div>
      </Section>

      <Section id="sg-form-message" title="Form message">
        <div className={styles.column}>
          <FormMessage tone="info">This is an info message.</FormMessage>
          <FormMessage tone="success">Saved successfully.</FormMessage>
          <FormMessage tone="error">Something went wrong.</FormMessage>
        </div>
      </Section>

      <Section id="sg-toast" title="Toast">
        <div className={styles.ground}>
          <Toast>Item added to bag</Toast>
        </div>
      </Section>

      <Section id="sg-skeleton" title="Skeleton">
        <div className={styles.row}>
          <Skeleton width="200px" height="20px" />
          <Skeleton width="40px" height="40px" circle />
        </div>
      </Section>
    </>
  )
}
