/**
 * Makes every rail's arrows work: one delegated click listener, mounted once by the header (which
 * every shop page carries), steps the rail an arrow names by one card. The rail itself is a Server
 * Component (`./rail`), so it adds no client code of its own to the pages that use it.
 */
import { useEffect } from 'react'

import { RAIL_FOR_ATTRIBUTE, RAIL_STEP_ATTRIBUTE } from './rail-attributes'

function onClick(event: MouseEvent) {
  const arrow = (event.target as Element | null)?.closest?.(`[${RAIL_STEP_ATTRIBUTE}]`)
  if (!arrow) return
  const rail = document.getElementById(arrow.getAttribute(RAIL_FOR_ATTRIBUTE) ?? '')
  const first = rail?.firstElementChild as HTMLElement | null
  if (!rail || !first) return
  const direction = arrow.getAttribute(RAIL_STEP_ATTRIBUTE) === '-1' ? -1 : 1
  const gap = parseFloat(getComputedStyle(rail).columnGap) || 0
  rail.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: 'smooth' })
}

export function useRailSteps() {
  useEffect(() => {
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}
