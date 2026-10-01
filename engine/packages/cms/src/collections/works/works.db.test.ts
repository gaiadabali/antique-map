/**
 * TASKS.md 8.2 on a real Postgres: a work saves with its validation, takes its uid once, refuses
 * an incomplete publish with every reason at once, holds its images to what a work may show,
 * refuses edits of a copy's synced fields (the deletes it guards: `./works-references.db.test`).
 * The schema is pushed (`./works.test-support`); without `CMS_TEST_POSTGRES_URL` it skips — a
 * setup state; a named server that refuses is a failure.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { server, startWorksStack, vocabulary, type WorksStack } from './works.test-support'

describe.skipIf(!server)('works on a real database', () => {
  let stack: WorksStack
  let ids: Awaited<ReturnType<typeof vocabulary>>
  let recto: number
  let verso: number

  beforeAll(async () => {
    stack = await startWorksStack('cms_works_test', (config, key) => getPayload({ config, key }))
    ids = await vocabulary(stack.api)
    recto = await stack.media('recto')
    verso = await stack.media('verso')
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  /** A work that may publish: a circa date, a credited maker, a primary place, recto and verso. */
  const complete = () => ({
    title: 'Bali by François Valentijn, c. 1726',
    objectType: 'map',
    date: { precision: 'circa', from: 1726 },
    makers: [{ maker: ids.maker, role: 'cartographer', certainty: 'attributed' }],
    places: [{ place: ids.place, role: 'depicts', primary: true }],
    subjects: [ids.subject],
    references: [{ source: ids.source, ref: '1268' }],
    condition: { grade: ids.grade, notes: 'Light toning.' },
    images: [{ media: recto }, { media: verso, caption: 'Verso: blank' }],
    dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
  })
  /** Publishes through a batch, as a seed or an importer would (the hooks need a collector). */
  const publish = (data: object) =>
    invalidationBatch().operation((context) =>
      stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
    )

  it('saves a draft with a circa date and a verso image, and gives it the brand’s next uid', async () => {
    const first = await stack.api.create({ collection: 'works', data: complete() })
    const second = await stack.api.create({ collection: 'works', data: { title: 'Another' } })
    expect(first.workUid).toMatch(/^TG-\d{6}$/)
    expect(Number(String(second.workUid).slice(3))).toBe(Number(String(first.workUid).slice(3)) + 1)
    const stored = await stack.api.findByID({
      collection: 'works',
      id: first.id,
      draft: true,
      depth: 0,
    })
    expect(stored).toMatchObject({
      _status: 'draft',
      date: { precision: 'circa', from: 1726 },
      images: [{ media: recto }, { media: verso, caption: 'Verso: blank' }],
      physical: { location: null, exportStatus: null },
    })
  })

  it('gives two works saved at once two uids', async () => {
    const made = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        stack.api.create({ collection: 'works', data: { title: `Race ${n}` } }),
      ),
    )
    expect(new Set(made.map((work) => work.workUid)).size).toBe(4)
  })

  it('never changes a uid once made', async () => {
    const work = await stack.api.create({ collection: 'works', data: { title: 'Kept' } })
    const errors = await refusedWith(() =>
      stack.api.update({ collection: 'works', id: work.id, data: { workUid: 'TG-999999' } }),
    )
    expect(errors).toEqual({ workUid: expect.stringMatching(/keeps its uid for ever/) })
  })

  it('validates every save, drafts included: dates, sizes, credits', async () => {
    const errors = await refusedWith(() =>
      stack.api.create({
        collection: 'works',
        data: {
          date: { from: 1726 },
          dateOnPlate: { precision: 'exact', from: 1700 },
          firstEdition: { precision: 'exact', from: 1690 },
          dimensions: { image: { height: 320, width: 360 }, sheet: { height: 310, width: 400 } },
          makers: [
            { maker: ids.maker, role: 'engraver', certainty: 'certain' },
            { maker: ids.maker, role: 'engraver', certainty: 'after' },
          ],
        },
      }),
    )
    expect(errors).toMatchObject({
      'date.precision': expect.stringMatching(/say how certain/),
      'dimensions.image.height': expect.stringMatching(/taller than the sheet/),
      'makers.1.maker': expect.stringMatching(/already credited/),
    })
  })

  it('refuses an incomplete work on publish, with every reason at once', async () => {
    const draft = await stack.api.create({ collection: 'works', data: { title: '' } })
    const errors = await refusedWith(() =>
      invalidationBatch().operation((context) =>
        stack.api.update({
          collection: 'works',
          id: draft.id,
          data: { _status: 'published' },
          context,
        }),
      ),
    )
    expect(Object.keys(errors).sort()).toEqual(
      ['title', 'objectType', 'date.precision', 'makers', 'images', 'condition.grade'].sort(),
    )
    expect(errors.images).toMatch(/Add a photograph of the whole front/)
    const stored = await stack.api.findByID({ collection: 'works', id: draft.id, depth: 0 })
    expect(stored._status).toBe('draft')
  })

  it('publishes a complete work with a blank location and export status: enquiry-only, never blocked', async () => {
    const work = await publish(complete())
    expect(work).toMatchObject({
      _status: 'published',
      physical: { location: null, exportStatus: null },
    })
  })

  it('refuses a synthetic, a detail-only or an AI-generated lead, and an image a work cannot show', async () => {
    const mockup = await stack.media('recto', 'composite')
    const detail = await stack.media('detail')
    const flat = await stack.media('flat')
    const ai = await stack.media('in-room', 'ai-generated')
    const saveErrors = await refusedWith(() =>
      stack.api.create({ collection: 'works', data: { images: [{ media: flat }, { media: ai }] } }),
    )
    expect(saveErrors).toEqual({
      'images.0.media': expect.stringMatching(/belongs to a product or a page/),
      'images.1.media': expect.stringMatching(/Nothing on a work is AI-generated/),
    })
    const lead = expect.stringMatching(/None of the images is a photograph/)
    expect(
      await refusedWith(() =>
        publish({ ...complete(), images: [{ media: detail }, { media: verso }] }),
      ),
    ).toEqual({ images: lead })
    // A mockup of the recto is refused on any save, and cannot lead the page either.
    expect(
      await refusedWith(() => publish({ ...complete(), images: [{ media: mockup }] })),
    ).toEqual({
      'images.0.media': expect.stringMatching(/Only a view in a room may be a mockup/),
      images: lead,
    })
  })

  it('refuses an image whose master waits on a re-take, or whose alt an AI drafted', async () => {
    const retake = await stack.media('recto', 'photograph', { verdict: 'fix-owner' })
    const drafted = await stack.media('recto', 'photograph', { altSource: 'ai-draft' })
    expect(
      await refusedWith(() => publish({ ...complete(), images: [{ media: retake }] })),
    ).toEqual({
      'images.0.media': expect.stringMatching(/waits on a re-take/),
    })
    expect(
      await refusedWith(() => publish({ ...complete(), images: [{ media: drafted }] })),
    ).toEqual({
      'images.0.media': expect.stringMatching(/An AI drafted this image’s description/),
    })
    const unchecked = await refusedWith(() =>
      publish({ ...complete(), cataloguing: { aiDraft: ['title'] } }),
    )
    expect(unchecked).toEqual({
      'cataloguing.aiDraft': expect.stringMatching(/An AI drafted Title/),
    })
  })

  it('takes a grade from the grade vocabulary only', async () => {
    const errors = await refusedWith(() =>
      stack.api.create({ collection: 'works', data: { condition: { grade: ids.subject } } }),
    )
    expect(Object.keys(errors)).toEqual(['condition.grade'])
  })

  it('makes a copy only through the sister sync, and refuses edits of its synced fields', async () => {
    const madeByHand = await refusedWith(() =>
      stack.api.create({ collection: 'works', data: { origin: { workUid: 'IG-000001' } } }),
    )
    expect(madeByHand).toEqual({ origin: expect.stringMatching(/Only the sister sync/) })
    const sync = { '@engine/sister:sync': true }
    const copy = await stack.api.create({
      collection: 'works',
      data: {
        title: 'Bali, 1726',
        objectType: 'map',
        origin: { brand: 'sister', workUid: 'IG-000001' },
      },
      context: sync,
    })
    const edit = await refusedWith(() =>
      stack.api.update({
        collection: 'works',
        id: copy.id,
        data: { title: 'Bali, c. 1726', objectType: 'print' },
      }),
    )
    expect(edit).toEqual({
      title: expect.stringMatching(/takes it from the sister archive/),
      objectType: expect.stringMatching(/takes it from the sister archive/),
    })
    const own = await stack.api.update({
      collection: 'works',
      id: copy.id,
      data: { seo: { title: 'Bali, from the archive' } },
    })
    expect(own).toMatchObject({ title: 'Bali, 1726', seo: { title: 'Bali, from the archive' } })
    const synced = await stack.api.update({
      collection: 'works',
      id: copy.id,
      data: { title: 'Bali, c. 1726' },
      context: sync,
    })
    expect(synced.title).toBe('Bali, c. 1726')
  })
})
