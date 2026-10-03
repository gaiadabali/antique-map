/**
 * Dev-only style guide. Renders every shared UI component in every state.
 * Mounted at /{locale}/style-guide on both hosts; the root layout sets
 * data-site, so each host renders in its own palette automatically.
 */

'use client'

import { DataDisplay } from './data-display'
import { DomainShell } from './domain-shell'
import { FormControls } from './form-controls'
import { LayoutShells } from './layout-shells'
import { Navigation } from './navigation'
import { Overlays } from './overlays'
import { Surfaces } from './surfaces'
import styles from './style-guide.module.css'

export function StyleGuide(): React.ReactElement {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Style guide</h1>
      <p className={styles.intro}>
        A dev page that shows every shared component in every state. Colours, type and spacing come
        from tokens; the root layout chooses the palette via data-site.
      </p>

      <FormControls />
      <Surfaces />
      <LayoutShells />
      <Overlays />
      <Navigation />
      <DataDisplay />
      <DomainShell />
    </div>
  )
}
