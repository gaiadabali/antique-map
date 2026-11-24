'use client'

import { useState } from 'react'

import { Button } from '@engine/ui/button'
import { Dialog } from '@engine/ui/dialog'

import { Section } from './section'
import styles from './style-guide.module.css'

export function Overlays(): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Section id="sg-dialog" title="Dialog">
      <div className={styles.row}>
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Example dialog">
          <p>Dialog body content.</p>
        </Dialog>
      </div>
    </Section>
  )
}
