/**
 * The accessibility pass's helpers (TASKS.md 10.2.b): axe, a keyboard walk and an accessibility
 * tree dump, each writing its evidence under `docs/gates/performance/` (override with
 * `A11Y_EVIDENCE`) so `docs/gates/performance.md` can point at files, not at a claim.
 *
 * The screen-reader pass is a TREE AUDIT, not NVDA: it reads the names, roles and order the
 * browser exposes (Playwright's aria snapshot and `page.accessibility`), which is what a screen
 * reader is given, but it does not prove how any reader speaks them.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const EVIDENCE = resolve(root, process.env.A11Y_EVIDENCE ?? 'docs/gates/performance')

export const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

/** Writes `content` under the evidence folder, making the folders it needs. */
export function writeEvidence(relative: string, content: string): void {
  const file = join(EVIDENCE, relative)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

export const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export type AxeRecord = {
  readonly label: string
  readonly width: number
  readonly violations: readonly string[]
  readonly counts: Readonly<Record<string, number>>
}

/** Every axe rule at the page's current width; zero violations of any impact is the bar. */
export async function axeAudit(page: Page, label: string): Promise<AxeRecord> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const counts: Record<string, number> = {}
  for (const violation of violations) {
    const impact = violation.impact ?? 'unknown'
    counts[impact] = (counts[impact] ?? 0) + 1
  }
  return {
    label,
    width: page.viewportSize()?.width ?? 0,
    counts,
    violations: violations.map(
      ({ id, impact, nodes }) =>
        `${impact ?? 'unknown'} ${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
    ),
  }
}

/** Axe at both widths; returns the records and fails on any violation. */
export async function axeBothWidths(page: Page, label: string): Promise<AxeRecord[]> {
  const records: AxeRecord[] = []
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    const record = await axeAudit(page, label)
    records.push(record)
    expect.soft(record.violations, `${label} at ${viewport.width} px`).toEqual([])
  }
  await page.setViewportSize(WIDTHS[0])
  return records
}

export type Stop = {
  /** A number given to the element the first time it has focus: the same number is the same element. */
  readonly id: number
  readonly role: string
  readonly name: string
  readonly tag: string
  readonly focusVisible: boolean
  readonly obscured: boolean
  /**
   * An empty `<div>` Cloudflare's Turnstile widget makes focusable inside its box, beside the widget's hidden answer field
   * `cf-turnstile-response` (the server runs with Turnstile's test keys in CI, so the form and
   * chat pages show it). Cloudflare's markup, not ours: listed in the walk, never a problem of ours.
   */
  readonly thirdParty: boolean
}

export type Walk = {
  readonly stops: readonly Stop[]
  readonly problems: readonly string[]
  readonly closed: boolean
  /** Links or buttons sharing one role and name — the same words for different targets. */
  readonly repeated: readonly string[]
}

type AxNode = { role?: string; name?: string; focused?: boolean; children?: AxNode[] }

function focusedOf(node: AxNode | null): AxNode | null {
  if (node === null) return null
  if (node.focused === true) return node
  for (const child of node.children ?? []) {
    const found = focusedOf(child)
    if (found !== null) return found
  }
  return null
}

/** What has focus now: its role and accessible name from the accessibility tree, and how it looks. */
export async function currentStop(page: Page): Promise<Stop | null> {
  const tree = await page.accessibility.snapshot({ interestingOnly: true })
  const node = focusedOf(tree as AxNode | null)
  const look = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const style = getComputedStyle(el)
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
    const shadow = style.boxShadow !== 'none'
    const box = el.getBoundingClientRect()
    const hit = document.elementFromPoint(
      Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1),
      Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1),
    )
    const mark = window as unknown as { __a11yCount?: number }
    const holder = el as unknown as { __a11yId?: number }
    holder.__a11yId ??= mark.__a11yCount = (mark.__a11yCount ?? 0) + 1
    return {
      id: holder.__a11yId,
      tag: el.tagName.toLowerCase(),
      focusVisible: outline || shadow,
      obscured: hit !== null && hit !== el && !el.contains(hit) && !hit.contains(el),
      thirdParty:
        el.tagName === 'DIV' &&
        el.childElementCount === 0 &&
        (el.textContent ?? '').trim() === '' &&
        !el.getAttribute('role') &&
        el.parentElement?.querySelector('input[name="cf-turnstile-response"]') != null,
    }
  })
  if (look === null) return null
  return { role: node?.role ?? 'none', name: node?.name ?? '', ...look }
}

/**
 * Presses Tab from the top of the page until focus leaves the page or comes round, recording every
 * stop. Problems: an interactive stop with no accessible name, no visible focus indicator, a
 * stop hidden behind another element (WCAG 2.4.11), or focus stuck on one element (a trap).
 */
export async function tabWalk(page: Page, max = 80, fromCurrent = false): Promise<Walk> {
  if (!fromCurrent) {
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur()
      window.scrollTo(0, 0)
    })
  }
  const stops: Stop[] = []
  const problems: string[] = []
  let closed = false
  let stuck = 0
  let previous = ''
  const seen = new Map<string, number>()
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab')
    const stop = await currentStop(page)
    if (stop === null) {
      closed = true
      break
    }
    const key = String(stop.id)
    if (stops.length > 0 && stop.id === stops[0]!.id) {
      closed = true
      break
    }
    stuck = key === previous ? stuck + 1 : 0
    previous = key
    stops.push(stop)
    seen.set(`${stop.role}|${stop.name}`, (seen.get(`${stop.role}|${stop.name}`) ?? 0) + 1)
    const where = `#${stops.length} ${stop.role} "${stop.name}" (${stop.tag})`
    if (!stop.thirdParty) {
      if (stop.name.trim() === '') problems.push(`${where}: no accessible name`)
      if (!stop.focusVisible) problems.push(`${where}: no visible focus indicator`)
      if (stop.obscured) problems.push(`${where}: focus hidden behind another element`)
    }
    if (stuck >= 2) {
      if (!stop.thirdParty) problems.push(`${where}: focus did not move (trap)`)
      break
    }
  }
  return {
    stops,
    problems,
    closed,
    repeated: [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${k} x${n}`),
  }
}

/** Tab until the focused element's accessible name matches; throws after `max` presses. */
export async function tabTo(page: Page, name: RegExp, max = 80): Promise<Stop> {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab')
    const stop = await currentStop(page)
    if (stop !== null && name.test(stop.name)) return stop
  }
  throw new Error(`keyboard focus never reached ${name} in ${max} Tab presses`)
}

/** The page's accessibility tree as the browser exposes it (roles, names, order) — a text file. */
export async function ariaTree(page: Page, file: string): Promise<string> {
  const tree = await page.locator('body').ariaSnapshot()
  writeEvidence(`a11y/tree/${file}.yml`, `${tree}\n`)
  return tree
}

/** One keyboard walk written as Markdown rows. */
export function walkMarkdown(label: string, width: number, walk: Walk): string {
  const rows = walk.stops
    .map(
      (s, at) =>
        `${at + 1}. ${s.role} "${s.name}" — ${s.tag}${s.focusVisible ? '' : ' (NO FOCUS RING)'}`,
    )
    .join('\n')
  const problems =
    walk.problems.length === 0 ? 'none' : walk.problems.map((p) => `- ${p}`).join('\n')
  return `### ${label} at ${width} px\n\nTab stops (${walk.stops.length}, ${walk.closed ? 'focus left the page or came round' : 'cut at the limit'}):\n\n${rows}\n\nProblems: ${problems}\n\nSame name on more than one stop: ${walk.repeated.length === 0 ? 'none' : walk.repeated.join('; ')}\n\n`
}

export async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(join(EVIDENCE, 'shots'), { recursive: true })
  await page.screenshot({
    path: join(EVIDENCE, 'shots', `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}
