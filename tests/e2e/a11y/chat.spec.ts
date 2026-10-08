/**
 * The chat's accessibility pass (TASKS.md 10.2.b) on the chat AS IT STANDS: axe at both widths with
 * the launcher closed and the panel open, a Tab walk through the open panel, Escape closing it with
 * focus returning to the launcher, and the panel's accessibility tree.
 *
 * First run on the panel before the 8.2cs redesign, repeated on the merged redesign (main
 * 3e9221d2). Against a local build with no AI key the panel opens in its error state (controls
 * disabled), so `A11Y_ORIGIN` points the same pass at staging, where the chat answers. It sends
 * nothing. Findings are recorded in `docs/gates/performance.md`, never fixed here.
 */
import { expect, test } from '@playwright/test'

import {
  axeAudit,
  currentStop,
  shoot,
  tabWalk,
  walkMarkdown,
  writeEvidence,
  WIDTHS,
  type AxeRecord,
} from './audit'
import type { SmokeMetadata } from '../../../playwright.config'

test('chat: axe, keyboard walk, Escape and accessibility tree', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(300000)
  const site = (testInfo.project.metadata as SmokeMetadata).site
  const origin = (process.env.A11Y_ORIGIN ?? baseURL ?? '').replace(/\/$/, '')
  const axe: AxeRecord[] = []
  let keyboard = `## ${site}: chat (the redesigned panel, 8.2.c, merged), keyboard walk\n\n`

  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await page.goto(`${origin}/`)
    const launcher = page.getByRole('button', { name: 'Chat with us' })
    await expect(launcher).toBeVisible()
    axe.push(await axeAudit(page, `${site} chat launcher`))

    await launcher.click()
    const dialog = page.getByRole('dialog', { name: 'Chat with us' })
    await expect(dialog).toBeVisible()
    // The panel loads its own script on opening; wait for its content to settle.
    await page.waitForLoadState('networkidle').catch(() => undefined)
    const record = await axeAudit(page, `${site} chat panel open`)
    axe.push(record)
    expect.soft(record.violations, `${site} chat panel at ${viewport.width} px`).toEqual([])
    await shoot(page, `${site}-chat-open-${viewport.width}`)
    if (viewport.width === WIDTHS[0].width) {
      await writeEvidence(`a11y/tree/${site}-chat-open.yml`, `${await dialog.ariaSnapshot()}\n`)
    }

    // Where focus is once the panel opens, then Tab from there: does it stay inside the dialog?
    const opened = await currentStop(page)
    keyboard += `Focus after opening at ${viewport.width} px: ${opened === null ? 'nowhere (body)' : `${opened.role} "${opened.name}"`}

`
    const walk = await tabWalk(page, 40, true)
    const outside = await dialog.evaluate((el) => !el.contains(document.activeElement))
    keyboard += `After tabbing, focus is ${outside ? 'OUTSIDE' : 'inside'} the dialog (no trap needed for a non-modal panel, but the order must make sense).

`
    keyboard += walkMarkdown('chat panel', viewport.width, walk)
    expect.soft(walk.problems, `${site} chat keyboard at ${viewport.width} px`).toEqual([])
    const inside = walk.stops.length > 0
    expect.soft(inside, 'Tab reaches something in the open chat').toBe(true)

    await page.keyboard.press('Escape')
    const closed = await dialog.isHidden()
    keyboard += `Escape closes the panel at ${viewport.width} px: ${closed ? 'yes' : 'NO'}\n\n`
    expect.soft(closed, `Escape closes the chat at ${viewport.width} px`).toBe(true)
    if (closed) {
      // The panel hands focus back on the next animation frame.
      await page.waitForTimeout(300)
      const stop = await currentStop(page)
      const back = stop?.name === 'Chat with us'
      keyboard += `Focus returns to the launcher: ${back ? 'yes' : `NO (${stop?.role} "${stop?.name}")`}\n\n`
      expect.soft(back, `focus returns to the launcher at ${viewport.width} px`).toBe(true)
    }
  }

  writeEvidence(`a11y/axe-${site}-chat.json`, `${JSON.stringify(axe, null, 2)}\n`)
  writeEvidence(`a11y/keyboard-${site}-chat.md`, keyboard)
})
