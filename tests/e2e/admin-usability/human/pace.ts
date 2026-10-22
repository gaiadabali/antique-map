/**
 * The timed test (CONTENT-OPERATIONS.md §7) at a person's pace: a simulation, not 10.4.a's real people. Every
 * action waits as a first-timer would — reading the recipe step and finding the control before a click,
 * typing a few characters a second, a file chooser, glancing at a page that just loaded — and the wall clock
 * runs from the prompt to the done state, the server's own time included. The model is PACE below; its
 * pauses vary by ±35 % from a seed per task, so a rerun is the same run. Results land in
 * `human-results.ndjson`, next to the proxy run's.
 */
import { appendFileSync, mkdirSync } from 'node:fs'

import type { Locator, Page, TestInfo } from '@playwright/test'

import { OUT, RUN, shoot, widthOf } from '../support'

/** Seconds (or ms per character) a first-timer spends; the gate quotes this model with the times. */
export const PACE = {
  /** Hearing the task and reading the recipe's first lines, before the first action. */
  start: 6,
  /** Reading a recipe step and finding its control, before each click on a desktop. */
  think: 2.5,
  /** The same on a phone, where the next step is one big button. */
  tapThink: 1.5,
  /** A page that just loaded: a glance to see it is the right one. */
  read: 2,
  /** One typed character: about four a second. */
  charMs: 250,
  /** Choosing a file in the system's file dialog. */
  fileDialog: 6,
} as const

/** A small seeded generator, so each task's pauses repeat run to run. */
function seeded(text: string): () => number {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export type Outcome = 'unaided' | 'helped' | 'not_done'

export class Human {
  private t0 = 0
  private t1 = 0
  private skipped = 0
  clicks = 0
  keys = 0
  pages = 0
  private readonly notes: string[] = []
  private readonly rand: () => number
  private readonly phone: boolean

  constructor(
    readonly page: Page,
    private readonly info: TestInfo,
    readonly task: string,
    readonly title: string,
    readonly targetSeconds: number,
  ) {
    this.rand = seeded(`${task}:${widthOf(info)}`)
    this.phone = widthOf(info) < 600
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame() && this.t0 > 0 && this.t1 === 0) this.pages += 1
    })
  }

  /** `seconds` of a person's time, varied ±35 %. */
  async pause(seconds: number): Promise<void> {
    await this.page.waitForTimeout(Math.round(seconds * 1000 * (0.65 + this.rand() * 0.7)))
  }

  async start(): Promise<void> {
    this.t0 = Date.now()
    await this.pause(PACE.start)
  }

  /** A page that just loaded, glanced at. */
  async read(seconds: number = PACE.read): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => undefined)
    await this.pause(seconds)
  }

  /** Find the control, move to it, click it. */
  async click(
    target: Locator,
    think: number = this.phone ? PACE.tapThink : PACE.think,
  ): Promise<void> {
    await target.scrollIntoViewIfNeeded()
    await this.pause(think)
    const box = await target.boundingBox()
    if (box && !this.phone) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 })
    }
    this.clicks += 1
    if (this.phone) await target.tap()
    else await target.click()
  }

  /** Click into a field and type `text` a character at a time (replacing what is there with `replace`). */
  async type(
    target: Locator,
    text: string,
    opts: { replace?: boolean; think?: number } = {},
  ): Promise<void> {
    await this.click(target, opts.think ?? 1.2)
    if (opts.replace) {
      await this.page.keyboard.press('Control+A')
      this.keys += 1
    }
    for (const ch of text) {
      await this.page.keyboard.type(ch)
      this.keys += 1
      await this.page.waitForTimeout(Math.round(PACE.charMs * (0.7 + this.rand() * 0.6)))
    }
  }

  /** Type into whatever has the focus, a character at a time. */
  async keysOnly(text: string): Promise<void> {
    for (const ch of text) {
      await this.page.keyboard.type(ch)
      this.keys += 1
      await this.page.waitForTimeout(Math.round(PACE.charMs * (0.7 + this.rand() * 0.6)))
    }
  }

  /** Select what is in the focused field and delete it. */
  async clearField(): Promise<void> {
    await this.page.keyboard.press('Control+A')
    await this.page.keyboard.press('Backspace')
    this.keys += 2
  }

  /** A Payload select or relationship field: open it, type part of the option, pick it. */
  async pick(field: Locator, text: string | RegExp, typed?: string): Promise<string> {
    await this.click(field.locator('.rs__control').first())
    if (typed) await this.keysOnly(typed)
    const option = this.page
      .locator('.rs__option, [role="option"]')
      .filter({ hasText: text })
      .first()
    await option.waitFor({ timeout: 20_000 })
    const label = (await option.innerText()).trim()
    await this.click(option, 1.2)
    return label
  }

  /** A file chosen in the system dialog. */
  async file(input: Locator, files: Parameters<Locator['setInputFiles']>[0]): Promise<void> {
    await this.pause(PACE.fileDialog)
    this.clicks += 1
    await input.setInputFiles(files)
  }

  /** Time spent outside the browser (WhatsApp, the spreadsheet), counted on the clock. */
  async away(seconds: number, what: string): Promise<void> {
    this.notes.push(`${seconds} s away from the admin: ${what} (modelled)`)
    await this.page.waitForTimeout(seconds * 1000)
  }

  /** A screenshot, left out of the time (it is not the person's). */
  async shot(name: string): Promise<void> {
    const s = Date.now()
    await shoot(this.page, this.info, `human-${name}`)
    this.skipped += Date.now() - s
  }

  stop(): void {
    this.t1 = Date.now()
  }

  seconds(): number {
    return Math.round(((this.t1 || Date.now()) - this.t0 - this.skipped) / 100) / 10
  }

  stumble(text: string): void {
    this.notes.push(text)
  }

  finish(outcome: Outcome, extra: Record<string, unknown> = {}): void {
    if (this.t1 === 0) this.stop()
    const seconds = this.seconds()
    const row = {
      run: RUN,
      task: this.task,
      title: this.title,
      width: widthOf(this.info),
      seconds,
      target: this.targetSeconds,
      withinTarget: seconds <= this.targetSeconds,
      outcome,
      clicks: this.clicks,
      keys: this.keys,
      pages: this.pages,
      notes: this.notes,
      pace: PACE,
      ...extra,
    }
    mkdirSync(OUT, { recursive: true })
    appendFileSync(`${OUT}/human-results.ndjson`, `${JSON.stringify(row)}\n`)
    console.log(`HUMAN ${JSON.stringify(row)}`)
  }
}
