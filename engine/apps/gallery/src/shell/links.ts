/**
 * Links the shell renders, built by C10's `href()` on the server from the brand's route map — a
 * component never spells a path (CONVENTIONS.md §6).
 */
import { createHref, type Href } from '@engine/config/routes'

import { currentBrand } from './brand'

let href: Href | undefined

export async function brandHref(): Promise<Href> {
  const { config } = await currentBrand()
  return (href ??= createHref(config))
}
