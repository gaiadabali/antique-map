'use client'

import { useState } from 'react'

import { FacetChip, Price, ResponsiveImage, StatusTimeline } from '../ui'

import { Section } from './section'
import styles from './style-guide.module.css'

const statusSteps = [
  { key: 'paid', label: 'Paid', at: '2026-10-03T09:00:00+08:00' },
  { key: 'processing', label: 'Processing', at: '2026-10-03T10:00:00+08:00' },
  { key: 'waiting_driver', label: 'Waiting for driver', at: undefined },
  { key: 'on_the_way', label: 'On the way', at: undefined },
  { key: 'delivered', label: 'Delivered', at: undefined },
]

export function DataDisplay(): React.ReactElement {
  const [facetPressed, setFacetPressed] = useState(false)

  return (
    <>
      <Section id="sg-price" title="Price">
        <div className={styles.row}>
          <Price amount={185000} />
          <Price amount={1250000} />
        </div>
      </Section>

      <Section id="sg-responsive-image" title="Responsive image">
        <div className={styles.row}>
          <ResponsiveImage
            variant="fixed"
            src="/gallery/placeholder.svg"
            alt="A decorative placeholder"
            width={200}
            height={150}
            sizes="200px"
          />
          <div style={{ width: 200 }}>
            <ResponsiveImage
              variant="fill"
              src="/gallery/placeholder.svg"
              alt="A decorative placeholder"
              aspectRatio="4 / 3"
              sizes="200px"
            />
          </div>
        </div>
      </Section>

      <Section id="sg-facet-chip" title="Facet chip">
        <div className={styles.row}>
          <FacetChip
            label="Maps"
            count={12}
            pressed={facetPressed}
            onToggle={() => setFacetPressed((prev) => !prev)}
          />
          <FacetChip label="Prints" count={8} pressed={false} />
          <FacetChip label="Selected" pressed />
        </div>
      </Section>

      <Section id="sg-status-timeline" title="Status timeline">
        <StatusTimeline steps={statusSteps} current="processing" />
      </Section>
    </>
  )
}
