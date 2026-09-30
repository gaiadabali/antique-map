'use server'
/**
 * The spike's writes, each a POST form that works without JavaScript (C13: every write a page
 * offers is a POST). A Server Action posted without JavaScript answers 303 See Other to the page —
 * the pattern C13 `FORM_RESULT` prescribes for the engine's `/api/x/` handlers, which will be DOM's.
 * `returnTo` must be one of this brand's public page addresses (C10), never another site.
 */
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { currentBrand } from '../shell/brand'
import { BAG_COOKIE, bagLines } from './bag'
import { keepFormResult } from './form-result'
import { availabilityTag, itemTag } from './reads'
import { SHIP_TO_COOKIE, shipToOptions } from './ship-to'
import { spikeControlsOn, spikeRoutesOn } from './flags'
import { safeReturnTo } from './return-to'
import { writeState } from './store'

const YEAR = 60 * 60 * 24 * 365

async function returnTo(form: FormData): Promise<string> {
  const { config } = await currentBrand()
  return safeReturnTo(String(form.get('returnTo') ?? '/'), config)
}

/** Every spike write refuses unless the spike is on (`./flags`): off, its route is not there. */
function refuseUnless(on: boolean): void {
  if (!on)
    throw new Error('the spike is off (SPIKE_ROUTES=1, and SPIKE_CONTROLS=1, on a workstation)')
}

export async function setShipTo(form: FormData): Promise<void> {
  refuseUnless(spikeRoutesOn())
  const { config } = await currentBrand()
  const country = String(form.get('country') ?? '')
  const option = shipToOptions(config).find((each) => each.country === country)
  if (option) {
    ;(await cookies()).set(SHIP_TO_COOKIE, option.country, {
      sameSite: 'lax',
      path: '/',
      maxAge: YEAR,
    })
  }
  await keepFormResult(option ? `shipTo.set:${option.country}` : 'shipTo.refused')
  redirect(await returnTo(form))
}

export async function removeBagLine(form: FormData): Promise<void> {
  refuseUnless(spikeRoutesOn())
  const line = Number(form.get('line'))
  const lines = await bagLines()
  const kept = lines.filter((id) => id !== line)
  ;(await cookies()).set(BAG_COOKIE, kept.join('.'), {
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    maxAge: YEAR,
  })
  await keepFormResult(kept.length < lines.length ? `bag.removed:${line}` : 'bag.unchanged')
  redirect(await returnTo(form))
}

/** Stands in for a sale or a release — what the domain's outbox will invalidate (`{ expire: 0 }`). */
export async function setAvailability(form: FormData): Promise<void> {
  refuseUnless(spikeControlsOn())
  const id = String(Number(form.get('item')))
  const to = form.get('to') === 'sold' ? 'sold' : 'available'
  writeState((state) => ({ ...state, availability: { ...state.availability, [id]: to } }))
  revalidateTag(availabilityTag(Number(id)), { expire: 0 })
  redirect(await returnTo(form))
}

/** Stands in for an editor's publish — what a Payload `afterChange` hook will invalidate (`'max'`). */
export async function editRecord(form: FormData): Promise<void> {
  refuseUnless(spikeControlsOn())
  const id = String(Number(form.get('item')))
  writeState((state) => ({
    ...state,
    edition: { ...state.edition, [id]: (state.edition[id] ?? 1) + 1 },
  }))
  revalidateTag(itemTag(Number(id)), 'max')
  redirect(await returnTo(form))
}
