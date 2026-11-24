/**
 * Test support only — the access suite for the data of the owner's feedback (TASKS.md 28.1.b), run
 * by each CMS on its own schema: the shop's (`./articles.db.test.ts`) and today's one CMS
 * (`@engine/cms`'s `collections/shop-feedback.db.test.ts`), each with the staff stack bound to it.
 *
 * - **articles** — the public reads published ones only, over REST and through a loader's
 *   projected read (`overrideAccess: false`, `_status: 'published'`, `select`); a store user reads
 *   none, drafts included; only the owner and editors write.
 * - **newsletter leads** — written by the server's lead service alone (the Local API, access
 *   overridden); nobody else creates, lists or reads one over REST.
 * - **themes, best sellers, flagship, region, partnership type** — stored and read back.
 */
import { invalidationBatch } from '@engine/cache'
import { describe, expect, it } from 'vitest'

import type { StaffStack } from '@engine/cms-core/db/staff-stack'

type Doc = Record<string, unknown> & { id: number }

/** A cache collector for one write: a test runs outside any Next request. */
const batch = () => invalidationBatch().context()

export type FeedbackSuiteOptions = {
  /** Starts the stack (the caller's `startStaffStack` with its own `getPayload`). */
  readonly stack: () => StaffStack
  /** What this CMS's leads need beside the kind and source: today's `site`. */
  readonly leadExtra?: Readonly<Record<string, unknown>>
}

export function feedbackAccessSuite(options: FeedbackSuiteOptions): void {
  const media = async (stack: StaffStack) => {
    // Rows alone, no files: what the relations check is the record's kind.
    const { rows } = await stack.pool.query(
      `INSERT INTO media (kind, filename, mime_type) VALUES
         ('image', 'p28-cover.webp', 'image/webp'), ('pdf', 'p28-article.pdf', 'application/pdf')
       RETURNING id`,
    )
    return { cover: Number(rows[0]?.id), pdf: Number(rows[1]?.id) }
  }

  const titles = (body: Record<string, unknown> | null) =>
    ((body?.docs ?? []) as Array<{ title?: string }>).map((doc) => doc.title).sort()

  describe('articles', () => {
    let published: Doc
    let draft: Doc

    it('publishes only with a cover picture, a PDF and a date', async () => {
      const stack = options.stack()
      const files = await media(stack)
      await expect(
        stack.payload.create({
          collection: 'articles',
          context: batch(),
          data: { title: 'No files', _status: 'published' } as never,
        }),
      ).rejects.toThrow(/cover|PDF/i)
      published = (await stack.payload.create({
        collection: 'articles',
        context: batch(),
        data: {
          title: 'Spice routes',
          summary: 'Maps of the Moluccas.',
          cover: files.cover,
          pdf: files.pdf,
          date: '2026-11-01T00:00:00.000Z',
          _status: 'published',
        } as never,
      })) as unknown as Doc
      draft = (await stack.payload.create({
        collection: 'articles',
        context: batch(),
        data: { title: 'Unfinished', _status: 'draft' } as never,
      })) as unknown as Doc
      // A PDF is not a cover picture, nor a picture an article: refused to the editor who picks.
      const swapped = await stack.rest('PATCH', `/api/articles/${published.id}`, {
        as: 'editor',
        json: { cover: files.pdf, pdf: files.cover },
      })
      expect(swapped.status).toBe(400)
    })

    it('shows the public the published ones alone, drafts included in no read', async () => {
      const stack = options.stack()
      const list = await stack.rest('GET', '/api/articles?depth=0')
      expect(list.status).toBe(200)
      expect(titles(list.body)).toEqual(['Spice routes'])
      expect(titles((await stack.rest('GET', '/api/articles?draft=true&depth=0')).body)).toEqual([
        'Spice routes',
      ])
      expect((await stack.rest('GET', `/api/articles/${draft.id}`)).status).toBe(404)
      expect((await stack.rest('GET', '/api/articles/versions')).status).toBe(403)
    })

    it('reads, as a loader does, published and projected', async () => {
      const { payload } = options.stack()
      const { docs } = await payload.find({
        collection: 'articles',
        overrideAccess: false,
        where: { _status: { equals: 'published' } },
        select: { title: true, date: true, cover: true, pdf: true },
        sort: '-date',
        depth: 0,
      })
      expect(docs).toHaveLength(1)
      expect(Object.keys(docs[0] ?? {}).sort()).toEqual(['cover', 'date', 'id', 'pdf', 'title'])
    })

    it('shows a store user no article, draft or published, and lets only the owner and editors write', async () => {
      const stack = options.stack()
      expect((await stack.rest('GET', '/api/articles', { as: 'store' })).status).toBe(403)
      expect((await stack.rest('GET', `/api/articles/${draft.id}`, { as: 'store' })).status).toBe(
        403,
      )
      expect((await stack.rest('GET', '/api/articles/versions', { as: 'store' })).status).toBe(403)
      expect(titles((await stack.rest('GET', '/api/articles', { as: 'editor' })).body)).toEqual([
        'Spice routes',
        'Unfinished',
      ])
      for (const as of [undefined, 'store'] as const) {
        const made = await stack.rest('POST', '/api/articles', { as, json: { title: 'Nope' } })
        expect(made.status, `create as ${as ?? 'public'}`).toBe(403)
      }
      const made = await stack.rest('POST', '/api/articles', {
        as: 'editor',
        json: { title: 'By an editor' },
      })
      expect(made.status).toBe(201)
    })
  })

  describe('newsletter leads', () => {
    it('are created by the server alone and read by the owner alone', async () => {
      const stack = options.stack()
      const lead = (await stack.payload.create({
        collection: 'leads',
        context: batch(),
        data: {
          kind: 'newsletter',
          source: 'form',
          ...options.leadExtra,
          payload: { email: 'reader@example.test', consentVersion: 'v1', locale: 'en' },
        } as never,
      })) as unknown as Doc
      const post = {
        json: { kind: 'newsletter', source: 'form', ...options.leadExtra, payload: {} },
      }
      expect((await stack.rest('POST', '/api/leads', post)).status).toBe(403)
      expect((await stack.rest('GET', '/api/leads')).status).toBe(403)
      expect((await stack.rest('GET', `/api/leads/${lead.id}`)).status).toBe(403)
      for (const as of ['editor', 'store'] as const) {
        expect((await stack.rest('POST', '/api/leads', { ...post, as })).status).toBe(403)
        expect((await stack.rest('GET', '/api/leads', { as })).status).toBe(403)
        expect((await stack.rest('GET', `/api/leads/${lead.id}`, { as })).status).toBe(403)
      }
      const owner = await stack.rest('GET', `/api/leads/${lead.id}?depth=0`, { as: 'owner' })
      expect(owner.status).toBe(200)
      expect(owner.body?.kind).toBe('newsletter')
    })

    it('keeps which of the two partnership enquiries a lead is', async () => {
      const { payload } = options.stack()
      const lead = (await payload.create({
        collection: 'leads',
        context: batch(),
        data: {
          kind: 'partnership',
          source: 'form',
          partnershipType: 'wholesale',
          ...options.leadExtra,
          payload: { name: 'A shop', email: 'shop@example.test' },
        } as never,
      })) as unknown as Doc
      expect(lead.partnershipType).toBe('wholesale')
    })
  })

  describe('themes, best sellers and the stores page', () => {
    it('stores a product’s themes and best-seller switch, and a store’s flagship and region', async () => {
      const stack = options.stack()
      const { payload } = stack
      const bali = (await payload.create({
        collection: 'themes',
        context: batch(),
        data: { label: 'Bali', _status: 'published' } as never,
      })) as unknown as Doc
      await payload.create({
        collection: 'themes',
        context: batch(),
        data: { label: 'Java', _status: 'draft' } as never,
      })
      const labels = (await stack.rest('GET', '/api/themes?depth=0')).body?.docs as Doc[]
      expect(labels.map((doc) => doc.label)).toEqual(['Bali'])
      expect((await stack.rest('GET', '/api/themes', { as: 'store' })).status).toBe(403)

      const product = (await payload.create({
        collection: 'products',
        context: batch(),
        data: {
          sku: 'P28-001',
          name: 'Bali map',
          themes: [bali.id],
          bestSeller: true,
          _status: 'draft',
        } as never,
      })) as unknown as Doc
      const read = (await payload.findByID({
        collection: 'products',
        id: product.id,
        depth: 0,
        draft: true,
      })) as unknown as Doc
      expect(read.themes).toEqual([bali.id])
      expect(read.bestSeller).toBe(true)

      const store = stack.stores[0].id
      const updated = (await payload.update({
        collection: 'stores',
        context: batch(),
        id: store,
        data: { flagship: true, region: 'ubud' } as never,
      })) as unknown as Doc
      expect([updated.flagship, updated.region]).toEqual([true, 'ubud'])
      expect((stack.stores[1] as Doc).flagship ?? false).toBe(false)
    })
  })
}
