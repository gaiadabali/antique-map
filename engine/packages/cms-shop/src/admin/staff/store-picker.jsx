'use client'
/**
 * The add-staff form's store (TASKS.md 27.7, the timed recipe): a box that narrows the stores as
 * the owner types any part of a store's name, code or area — "ubud", "DPS-014" — above the list of
 * the stores that match. A native select's type-ahead matches only the start of a name, and when a
 * hundred stores share their first words ("Old East Indies …") the owner had to type twenty letters
 * to reach one. When one store is left it is chosen; otherwise the owner picks it in the list. The
 * list is the form's `store` value, so the save is unchanged. `.jsx`: see `../leads/shared.jsx`.
 */
import { useMemo, useState } from 'react'

import { S } from './copy'

/** Every typed word found in the store's name, code or area, in any order and case. */
export function storesMatching(stores, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return stores
  return stores.filter((store) => {
    const haystack = `${store.label} ${store.area ?? ''}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

export function StorePicker({ id, language, stores, initial = '' }) {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState(initial)
  const shown = useMemo(() => storesMatching(stores, query), [stores, query])
  // One store left: that is the one. Otherwise the choice stands only while it is still listed.
  const value =
    shown.length === 1
      ? String(shown[0].id)
      : shown.some((s) => String(s.id) === chosen)
        ? chosen
        : ''

  return (
    <>
      <input
        id={`${id}-find`}
        type="search"
        className="ix-input"
        aria-label={S('storeFind', language)}
        placeholder={S('storeFind', language)}
        aria-controls={id}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="ix-muted ix-staff-count" aria-live="polite">
        {S('storeCount', language, { count: String(shown.length) })}
      </p>
      <select
        id={id}
        name="store"
        className="ix-input ix-staff-stores"
        size={Math.min(6, Math.max(2, shown.length))}
        value={value}
        onChange={(event) => setChosen(event.target.value)}
      >
        {shown.map((store) => (
          <option key={store.id} value={String(store.id)}>
            {store.label}
          </option>
        ))}
      </select>
    </>
  )
}
