import {
  Badge,
  Card,
  Eyebrow,
  FormMessage,
  Hairline,
  Mat,
  MatNote,
  ProofPoints,
  SectionHead,
  Skeleton,
  Toast,
} from '../ui'

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
          <Eyebrow mark>Art souvenirs of the East Indies</Eyebrow>
        </div>
      </Section>

      <Section id="sg-section-head" title="Section head">
        <SectionHead
          eyebrow="How we make them"
          title="From an original in our hands to a print on your wall"
          lede="300gsm cotton and archival pigment inks, printed in Bali."
          action={<a href="#sg-section-head">Shop all prints</a>}
        />
      </Section>

      <Section id="sg-mat" title="Mat">
        <div className={styles.row}>
          <div className={styles.matSample}>
            <Mat ratio={4 / 5}>
              <MatNote>Default mat, 4:5</MatNote>
            </Mat>
          </div>
          <div className={styles.matSample}>
            <Mat ratio={1} size="compact">
              <MatNote>Compact mat</MatNote>
            </Mat>
          </div>
        </div>
      </Section>

      <Section id="sg-proof-points" title="Proof points">
        <ProofPoints items={['Restored by hand', 'Printed in Bali', 'Stocked in 100+ shops']} />
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
