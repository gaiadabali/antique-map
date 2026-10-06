/**
 * The `pages` reads on a real database (5.4.b): a draft page is null, another site's page is
 * null, a page and a story do not resolve under each other's kind, a curated page's works come
 * through the card projection with no `askingPrice`.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startWorksStack,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'
import { loadPageWith } from './queries'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'the gallery pages read on a real database',
  () => {
    let stack: WorksStack

    const publish = (data: object) =>
      invalidationBatch().operation((context) =>
        stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('web_pages_test', (config, key) => getPayload({ config, key }))
      const recto = await stack.media('recto')
      const maker = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'makers',
          data: {
            name: 'François Valentijn',
            sortName: 'VALENTIJN, François',
            _status: 'published',
          },
        }),
      )
      const place = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'places',
          data: { name: 'Batavia', slug: 'batavia', _status: 'published' },
        }),
      )
      const grade = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'terms',
          data: { kind: 'grade', label: 'VG+', definition: 'Very good.', equivalent: 'A' },
        }),
      )
      const work = await publish({
        title: 'Kaart van Java',
        stockNumber: 'M.0701',
        objectType: 'map',
        date: { precision: 'circa', from: 1726 },
        makers: [{ maker: maker.id, role: 'cartographer', certainty: 'attributed' }],
        places: [{ place: place.id, role: 'depicts', primary: true }],
        condition: { grade: grade.id },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
      })

      // `title` is a localized field and `pagePublishGuard` reads it as a locale-keyed object
      // (`data.title.en`) when deciding whether a publish names a title — true of a save made with
      // `locale: 'all'`, which is how the admin's "all locales" tab submits. A plain string under
      // the default locale alone leaves the guard reading `undefined`, so every publish here goes
      // through `locale: 'all'` with `title` (and the other localized fields) keyed by locale.
      await stack.api.create({
        collection: 'pages',
        locale: 'all',
        data: {
          site: 'gallery',
          kind: 'page',
          title: { en: 'About us' },
          slug: 'about',
          intro: { en: 'Since 2001.' },
          body: { en: 'Paragraph one.\n\nParagraph two.' },
          _status: 'published',
        },
      })
      await stack.api.create({
        collection: 'pages',
        data: {
          site: 'gallery',
          kind: 'page',
          title: 'Draft page',
          slug: 'draft-page',
          body: 'Not published.',
        },
      })
      await stack.api.create({
        collection: 'pages',
        locale: 'all',
        data: {
          site: 'shop',
          kind: 'page',
          title: { en: 'Shop about' },
          slug: 'about',
          body: { en: 'The shop, not the gallery.' },
          _status: 'published',
        },
      })
      await stack.api.create({
        collection: 'pages',
        locale: 'all',
        data: {
          site: 'shop',
          kind: 'page',
          title: { en: 'Delivery' },
          slug: 'delivery',
          body: { en: 'Only the shop has this page.' },
          _status: 'published',
        },
      })
      await stack.api.create({
        collection: 'pages',
        locale: 'all',
        data: {
          site: 'gallery',
          kind: 'story',
          title: { en: 'A cartographer in Batavia' },
          slug: 'a-cartographer-in-batavia',
          body: { en: 'An essay.' },
          works: [work.id],
          _status: 'published',
        },
      })
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('loads a published gallery page by slug, its body split into paragraphs', async () => {
      const page = await loadPageWith(stack.payload, 'about', 'en', 'page')
      expect(page).not.toBeNull()
      expect(page?.title).toBe('About us')
      expect(page?.body).toEqual(['Paragraph one.', 'Paragraph two.'])
    }, 30_000)

    it('a draft page is null', async () => {
      expect(await loadPageWith(stack.payload, 'draft-page', 'en', 'page')).toBeNull()
    }, 30_000)

    it("another site's page is null, and never wins over the gallery's own slug", async () => {
      // A slug only the shop has resolves to nothing on the gallery.
      expect(await loadPageWith(stack.payload, 'delivery', 'en', 'page')).toBeNull()
      // A slug both sites have resolves to the gallery's record.
      const page = await loadPageWith(stack.payload, 'about', 'en', 'page')
      expect(page?.title).toBe('About us')
    }, 30_000)

    it('a story does not resolve as a plain page, and a page does not resolve as a story', async () => {
      expect(
        await loadPageWith(stack.payload, 'a-cartographer-in-batavia', 'en', 'page'),
      ).toBeNull()
      expect(await loadPageWith(stack.payload, 'about', 'en', 'story')).toBeNull()
    }, 30_000)

    it("a story's works come through the card projection with no askingPrice", async () => {
      const story = await loadPageWith(stack.payload, 'a-cartographer-in-batavia', 'en', 'story')
      expect(story?.works.map((w) => w.title)).toEqual(['Kaart van Java'])
      expect(JSON.stringify(story).includes('askingPrice')).toBe(false)
    }, 30_000)
  },
)
