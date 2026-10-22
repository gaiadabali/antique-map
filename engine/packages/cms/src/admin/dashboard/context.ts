/**
 * Who may ask the dashboard anything (DR-10, ANALYTICS.md §8, SECURITY.md §2.2): the owner, and
 * nobody else — an editor and a store user get the panel-less state, and nobody signed in gets
 * nothing. The loaders take a `DashboardContext`, which only `ownerContext` makes, so no loader
 * can run for a caller who was never checked.
 *
 * Two checks, both of which must pass. The role is read off the user; and one row of each
 * collection the panels read (`events`, `leads`, `chat-sessions`) is asked for through the Local
 * API as that user with `overrideAccess: false`, so the collections' own access functions stay the
 * authority and the dashboard can never see more than they would show. The panels then group in
 * SQL, which is why this check comes first and never trusts what a caller says about itself.
 */
import type { Payload } from 'payload'

import { hasRole, type SignedIn } from '../../collections/users/roles'

import type { Period } from './period'

export type Site = 'gallery' | 'shop'
export const SITES: readonly Site[] = ['gallery', 'shop']

export const isSite = (value: unknown): value is Site => value === 'gallery' || value === 'shop'

/** Thrown for anyone but the owner. The message names no collection and no number. */
export class DashboardForbidden extends Error {
  override readonly name = 'DashboardForbidden'
  constructor() {
    super('The dashboard is the owner’s.')
  }
}

declare const checked: unique symbol

/** What every loader takes: the owner's request, with the user the reads act as. */
export type DashboardContext = {
  readonly [checked]: true
  readonly payload: Payload
  readonly user: NonNullable<SignedIn>
  readonly site: Site
  readonly period: Period
  /** The clock the panels read ("waiting now"); a test passes its own. */
  readonly now: Date
}

/** The collections the panels read; each is asked for one row as the acting user. */
const READ_COLLECTIONS = ['events', 'leads', 'chat-sessions'] as const

type Finder = { find: (args: object) => Promise<unknown> }

export async function ownerContext(
  payload: Payload,
  user: SignedIn,
  site: Site,
  period: Period,
  now: Date = new Date(),
): Promise<DashboardContext> {
  if (user === null || user === undefined || !hasRole(user, 'owner')) throw new DashboardForbidden()
  try {
    for (const collection of READ_COLLECTIONS) {
      await (payload as unknown as Finder).find({
        collection,
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: false,
        user,
      })
    }
  } catch {
    throw new DashboardForbidden()
  }
  return { payload, user, site, period, now } as DashboardContext
}
