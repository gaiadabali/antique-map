'use client'
/**
 * The product list's quick filters and bulk move (TASKS.md 27.2.d). The filters are links to list
 * addresses (`./list-filters`), the category a select that opens its address. The move takes the
 * rows ticked in Payload's own table (`useSelection`, the same selection its bulk Publish and
 * Unpublish use) and patches their category through `PATCH /api/products?where…` as the person.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { toast, useSelection } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { L } from './copy'
import { moveRequest } from './list-filters'
import { refusalOf } from './photos'
import './editor.css'

function Chip({ href, current, children }) {
  return (
    <Link
      className="pe-chip"
      href={href}
      prefetch={false}
      aria-current={current ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}

function BulkMove({ categories, language }) {
  const router = useRouter()
  const { count, getQueryParams } = useSelection()
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  if (!count) return <p className="pe-help">{L('bulkHint', language)}</p>

  async function move() {
    if (category === '') return
    setBusy(true)
    const request = moveRequest(
      getQueryParams(),
      Number.isNaN(Number(category)) ? category : Number(category),
    )
    try {
      const response = await globalThis.fetch(request.url, {
        method: request.method,
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request.body),
      })
      const json = await response.json().catch(() => null)
      const done = Array.isArray(json?.docs) ? json.docs.length : 0
      if (done > 0) toast.success(L('moved', language, { n: done }))
      if (!response.ok || (json?.errors?.length ?? 0) > 0) {
        toast.error(L('moveFailed', language, { reason: refusalOf(json, String(response.status)) }))
      }
      router.refresh()
    } catch {
      toast.error(L('moveFailed', language, { reason: L('tryAgain', language) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pe-bulk">
      <label className="pe-mini-label" htmlFor="pe-bulk-category">
        {L('moveTo', language, { n: count })}
      </label>
      <select
        id="pe-bulk-category"
        className="pe-select"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      >
        <option value="">{L('filterCategory', language)}</option>
        {categories.map((each) => (
          <option key={each.id} value={each.id}>
            {each.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="pe-btn"
        disabled={busy || category === ''}
        onClick={() => void move()}
      >
        {L('move', language)}
      </button>
    </div>
  )
}

export function ListBarClient({ language, active, links, categories }) {
  const router = useRouter()
  const current = active.startsWith('category:') ? active.slice('category:'.length) : ''
  return (
    <div className="pe-listbar">
      <nav className="pe-chips" aria-label={L('quickFilters', language)}>
        <Chip href={links.all} current={active === 'all'}>
          {L('filterAll', language)}
        </Chip>
        <Chip href={links.drafts} current={active === 'drafts'}>
          {L('filterDrafts', language)}
        </Chip>
        {links.outOfStock ? (
          <Chip href={links.outOfStock} current={active === 'outOfStock'}>
            {L('filterOutOfStock', language)}
          </Chip>
        ) : null}
        <label className="pe-visually-hidden" htmlFor="pe-filter-category">
          {L('filterCategory', language)}
        </label>
        <select
          id="pe-filter-category"
          className="pe-select pe-chips__select"
          value={current}
          onChange={(event) => {
            const chosen = categories.find((each) => each.id === event.target.value)
            router.push(chosen ? chosen.href : links.all)
          }}
        >
          <option value="">{L('anyCategory', language)}</option>
          {categories.map((each) => (
            <option key={each.id} value={each.id}>
              {each.label}
            </option>
          ))}
        </select>
      </nav>
      <BulkMove categories={categories} language={language} />
    </div>
  )
}
