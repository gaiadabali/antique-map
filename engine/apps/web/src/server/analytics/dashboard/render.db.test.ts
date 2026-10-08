/**
 * The owner's dashboard view rendered on a real Postgres (TASKS.md 9.2.b): both site tabs, in both
 * of the admin's languages, with the numbers the loaders found; a site with no events says so; the
 * shop tab's run-2 panels are stubs. An editor on the same database is shown none of it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DashboardView } from '../../../../../../packages/cms/src/admin/dashboard/view'

import { server, startDashboardStack, type Dashboardish } from './dashboard.test-support'

describe.skipIf(!server)('the dashboard view, on a real database', () => {
  let t: Dashboardish

  beforeAll(async () => {
    t = await startDashboardStack('web_dash_render')
    await t.send('gallery', [
      { name: 'page.viewed', at: t.noon(1), props: { pageType: 'home' } },
      {
        name: 'search.submitted',
        at: t.noon(1),
        props: { query: 'peta lombok', resultCount: 0, zeroResults: true },
      },
    ])
  }, 240_000)
  afterAll(() => t?.stop(), 60_000)

  const render = async (
    role: 'owner' | 'editor',
    query: Record<string, string>,
    language = 'en',
  ) => {
    const req = { user: t.as(role), payload: t.payload, i18n: { language } } as never
    return renderToStaticMarkup(
      (await DashboardView({ initPageResult: { req }, searchParams: query })) as never,
    )
  }

  it('shows the owner the gallery panels with their numbers', async () => {
    const html = await render('owner', { site: 'gallery', period: '7' })
    for (const title of ['Visitors', 'Search', 'Antiques', 'Asks and sells', 'Chat']) {
      expect(html).toContain(`>${title}<`)
    }
    expect(html).toContain('peta lombok')
    expect(html).toContain('Indies Gallery')
    expect(html).toContain('Old East Indies')
    // Nothing was asked or chatted yet: those panels say so instead of showing zeros.
    expect(html).toContain('No events yet in this period.')
    expect(html).toContain('No chat sessions yet in this period.')
    expect(html).not.toContain('Funnel')
  }, 60_000)

  it('writes the same page in Indonesian for an Indonesian admin', async () => {
    const html = await render('owner', { site: 'gallery' }, 'id')
    expect(html).toContain('>Pengunjung<')
    expect(html).toContain('Belum ada peristiwa pada periode ini.')
  }, 60_000)

  it('the shop tab has its shop panels, empty without events', async () => {
    const html = await render('owner', { site: 'shop', period: '30' })
    for (const title of ['Funnel', 'Sales', 'Fulfilment', 'Payments', 'Web vitals']) {
      expect(html).toContain(`>${title}<`)
    }
    // The run-2 stubs are real panels now: with no events they say so, with no stub copy left.
    expect(html).toContain('No events yet in this period.')
    expect(html).not.toContain('arrives with the checkout events')
    expect(html).not.toContain('>Antiques<')
  }, 60_000)

  it('an editor on the same database sees no panel and no number', async () => {
    const html = await render('editor', { site: 'gallery' })
    expect(html).toContain('Your account has no panels here.')
    expect(html).not.toContain('peta lombok')
    expect(html).not.toContain('<table')
  }, 60_000)
})
