/**
 * The brand this process serves: `BRAND` / `BRAND_ROOT`, checked against what this app can render
 * (`../supports`) and memoised per process by the loader. A brand this app cannot render refuses to
 * load rather than render a blank section (BRANDS.md §6).
 *
 * It is a request-time read by construction: `connection()` first, so no caller — a layout, a page,
 * metadata — can read the brand while `next build` prerenders. Next renders a layout and its page
 * concurrently, so the layout's own `connection()` does not hold the page back (the 4.1.e spike);
 * the build has no brand, and must never bake one in (ARCHITECTURE.md §9).
 */
import { loadBrand, type LoadedBrand } from '@engine/config/loader'
import { connection } from 'next/server'

import { supports } from '../supports'

export async function currentBrand(): Promise<LoadedBrand> {
  await connection()
  return loadBrand({ supports })
}
