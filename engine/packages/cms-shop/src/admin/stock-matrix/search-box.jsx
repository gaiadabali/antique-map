'use client'
/**
 * The matrix's search box (TASKS.md 27.4.b): the list narrows as the person types — a moment after
 * the last key, the page's address takes the search (`router.replace`, so Back is not a trail of
 * keystrokes) and the server renders the matching products. Enter still submits the plain GET form
 * around it, which also works before the page's script has loaded. Timed against the plan's
 * ≤ 0:20 for one count: no Enter and no full page load between typing and the row.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { matrixHref } from './grid'

/** A pause after the last key before the list follows: typing at a person's pace is not a search. */
const SETTLE_MS = 350

export function SearchBox({ query, placeholder }) {
  const router = useRouter()
  const timer = useRef(null)
  useEffect(() => () => globalThis.clearTimeout(timer.current), [])

  return (
    <input
      id="sm-q"
      name="q"
      type="search"
      className="ix-input"
      defaultValue={query.q}
      maxLength={100}
      autoComplete="off"
      placeholder={placeholder}
      onChange={(event) => {
        const q = event.target.value.trim()
        globalThis.clearTimeout(timer.current)
        timer.current = globalThis.setTimeout(() => {
          if (q !== query.q) router.replace(matrixHref(query, { q }), { scroll: false })
        }, SETTLE_MS)
      }}
    />
  )
}
