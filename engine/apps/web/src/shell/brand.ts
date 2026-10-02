/**
 * The brand this process serves: `BRAND` / `BRAND_ROOT`, memoised per process by the loader.
 *
 * The one app renders either brand (TASKS.md 2.1, CARRY-OVER.md §3 step 4), so it passes no
 * per-app `supports` list any more: until the host picks the site (2.2), a process still serves
 * one brand, chosen by `BRAND`, and the loader's own rules still refuse a config CI would refuse.
 *
 * It is a request-time read by construction: `connection()` first, so no caller — a layout, a page,
 * metadata — can read the brand while `next build` prerenders. Next renders a layout and its page
 * concurrently, so the layout's own `connection()` does not hold the page back (the 4.1.e spike);
 * the build has no brand, and must never bake one in (ARCHITECTURE.md §6).
 */
import { loadBrand, type LoadedBrand } from '@engine/config/loader'
import { connection } from 'next/server'

export async function currentBrand(): Promise<LoadedBrand> {
  await connection()
  return loadBrand()
}
