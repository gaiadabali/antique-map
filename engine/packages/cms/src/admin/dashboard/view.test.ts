/**
 * The dashboard view's gate and its copy, without a database (TASKS.md 9.2.b): an editor or a store
 * user gets the panel-less state — one sentence, no panel and no number — in the language of their
 * admin; nobody signed in is sent to the login. The owner's rendering is checked against a real
 * database in `engine/apps/web/src/server/analytics/dashboard/render.db.test.ts`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { COPY } from './copy'
import { DashboardView } from './view'

const view = async (user: object | null, language = 'en') => {
  // No `payload` on the request: a view that reached for data here would throw.
  const req = { user, i18n: { language } } as never
  return renderToStaticMarkup((await DashboardView({ initPageResult: { req } })) as never)
}

describe('the dashboard view', () => {
  it('an editor sees the panel-less state', async () => {
    const html = await view({ collection: 'users', role: 'editor' })
    expect(html).toContain(COPY.panelLess.en)
    for (const panel of ['visitors', 'search', 'antiques', 'chatPanel', 'asksAndSells'] as const) {
      expect(html).not.toContain(`>${COPY[panel].en}<`)
    }
    expect(html).not.toContain('<table')
    expect(html).not.toContain('<form')
  })

  it('a store user sees it too, in Indonesian when the admin is', async () => {
    const html = await view({ collection: 'users', role: 'store', store: 1 }, 'id')
    expect(html).toContain('Akun Anda tidak memiliki panel')
    expect(html).not.toContain('<table')
  })

  it('nobody signed in is sent to the login, with the way back', async () => {
    await expect(view(null)).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/login?redirect=%2Fadmin%2Fdashboard'),
    })
  })

  it('every label has both languages', () => {
    for (const [key, pair] of Object.entries(COPY)) {
      expect(pair.en, key).not.toBe('')
      expect(pair.id, key).not.toBe('')
    }
  })
})
