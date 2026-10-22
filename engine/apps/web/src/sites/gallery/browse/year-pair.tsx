'use client'

/**
 * The period's from–to year pair (5.1.b; EXPERIENCE-GALLERY.md §4): two number inputs, never a
 * slider alone. A plain GET form first — without JavaScript it sends the two years as two `date`
 * values beside the other filters' hidden inputs, which `url-state` reads as the pair — and with
 * JavaScript it goes straight to the canonical address, the pair as one `from-to` value.
 *
 * The route table that builds that address (`@engine/config/sites`) loads on submit, not with the
 * page: the listing's first load stays inside its script budget (5.5 Lighthouse follow-up). Should
 * it fail to load, the form submits as it would without JavaScript.
 */
import type { FormEvent } from 'react'

import type { ListingQuery, SiteLocale } from '@engine/config/sites'

// From their own folders, never the `shared/ui` barrel: a Client Component importing the barrel
// ships every shared component to the browser.
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import styles from './facets.module.css'

/** The canonical browse address of `query`, with the gallery's route table loaded on demand. */
async function browseHrefOf(query: ListingQuery, locale: SiteLocale): Promise<string> {
  const { createHref, SITES } = await import('@engine/config/sites')
  return createHref(SITES.gallery)('browse', query, locale)
}

export function YearPair({
  idPrefix,
  action,
  hidden,
  listing,
  locale,
  from,
  to,
  labels,
}: {
  /** The panel renders twice (the phone's sheet, the desktop's column): ids stay unique. */
  readonly idPrefix: string
  /** The browse page's own address: the form's no-JavaScript target. */
  readonly action: string
  readonly hidden: readonly (readonly [string, string])[]
  /** The state's listing query without its year pair, for the canonical address. */
  readonly listing: ListingQuery
  readonly locale: SiteLocale
  readonly from: number | null
  readonly to: number | null
  readonly labels: { readonly from: string; readonly to: string; readonly apply: string }
}): React.ReactElement {
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    const form = event.currentTarget
    const data = new FormData(form)
    const [first = '', second = ''] = data.getAll('date').map(String)
    if (first === '' && second === '') return
    event.preventDefault()
    const { page: _page, ...rest } = listing
    const date = [...[rest.facets?.date ?? []].flat(), `${first}-${second}`]
    browseHrefOf({ ...rest, facets: { ...rest.facets, date } }, locale).then(
      (address) => window.location.assign(address),
      // `submit()` skips this handler: the plain GET the form sends without JavaScript.
      () => form.submit(),
    )
  }
  return (
    <form method="get" action={action} className={styles.yearPair} onSubmit={submit}>
      {hidden.map(([name, value]) => (
        <input key={`${name}=${value}`} type="hidden" name={name} value={value} />
      ))}
      <Input
        id={`${idPrefix}-period-from`}
        label={labels.from}
        type="number"
        name="date"
        inputMode="numeric"
        min={1}
        max={2100}
        defaultValue={from ?? undefined}
        className={styles.yearInput}
      />
      <Input
        id={`${idPrefix}-period-to`}
        label={labels.to}
        type="number"
        name="date"
        inputMode="numeric"
        min={1}
        max={2100}
        defaultValue={to ?? undefined}
        className={styles.yearInput}
      />
      <Button type="submit" variant="secondary" size="small">
        {labels.apply}
      </Button>
    </form>
  )
}
