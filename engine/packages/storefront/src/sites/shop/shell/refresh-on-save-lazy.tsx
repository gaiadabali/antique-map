'use client'

/**
 * The preview's refresh on save (`./refresh-on-save`), loaded on demand: only a staff member's
 * preview draws it, so its code is its own chunk, fetched by a preview alone and never part of a
 * visitor's scripts (the home's JS budget, DESIGN-SYSTEM.md). React's `lazy`, not `next/dynamic`:
 * it renders nothing, so it needs no server half, and the shell's scripts carry none of that one's
 * code.
 */
import { lazy, Suspense } from 'react'

const Refresh = lazy(() =>
  import('./refresh-on-save').then((module) => ({ default: module.RefreshOnSave })),
)

export function RefreshOnSave() {
  return (
    <Suspense fallback={null}>
      <Refresh />
    </Suspense>
  )
}
