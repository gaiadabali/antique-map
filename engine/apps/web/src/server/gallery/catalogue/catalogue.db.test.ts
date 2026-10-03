/**
 * 5.1.a on a real database: the listing and its facets never read what the gallery must not show,
 * never see a draft, count every filter but their own, and roll the place counts up the tree.
 * The schema is pushed (`works.test-support`); without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { descendantIdsOf, loadPlaces } from './places'
import type { FilterContext } from './db'
import { listWorks } from './listing'
import { facetsOf } from './facets'
import { projectCards, WORK_CARD_SELECT } from './projection'
import { EMPTY_STATE, type FacetState } from './state'
import { startWorksStack, type WorksStack } from '../../../../../../packages/cms/src/collections/works/works.test-support'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)('gallery catalogue listing on a real database', () => {
  let stack: WorksStack
  let ctx: FilterContext
  let publishedIds: number[]
  let javaId: number

  /** A published work the listing may show: complete, credited, placed, one subject. */
  const publish = (data: object) =>
    invalidationBatch().operation((context) =>
      stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
    )

  beforeAll(async () => {
    stack = await startWorksStack('web_cat_test', (config, key) => getPayload({ config, key }))
    const recto = await stack.media('recto')
    const verso = await stack.media('verso')

    const valentijn = await stack.api.create({
      collection: 'makers',
      data: { name: 'François Valentijn', sortName: 'VALENTIJN, François', _status: 'published' },
    })
    const luyken = await stack.api.create({
      collection: 'makers',
      data: { name: 'Jan Luyken', sortName: 'LUYKEN, Jan', _status: 'published' },
    })

    const java = await stack.api.create({
      collection: 'places',
      data: { name: 'Java', slug: 'java', _status: 'published' },
    })
    javaId = Number(java.id)
    const batavia = await stack.api.create({
      collection: 'places',
      data: { name: 'Batavia', slug: 'batavia', parent: java.id, _status: 'published' },
    })
    const sulawesi = await stack.api.create({
      collection: 'places',
      data: { name: 'Sulawesi', slug: 'sulawesi', _status: 'published' },
    })

    const voc = await stack.api.create({
      collection: 'terms',
      data: { kind: 'subject', label: 'VOC', _status: 'published' },
    })
    const zeeland = await stack.api.create({
      collection: 'terms',
      data: { kind: 'subject', label: 'Zeeland trade', _status: 'published' },
    })
    const grade = await stack.api.create({
      collection: 'terms',
      data: { kind: 'grade', label: 'VG+', definition: 'Very good, nearly fine.', equivalent: 'A' },
    })

    const complete = (over: object) => ({
      objectType: 'map',
      date: { precision: 'circa', from: 1726 },
      makers: [{ maker: valentijn.id, role: 'cartographer', certainty: 'attributed' }],
      places: [{ place: batavia.id, role: 'depicts', primary: true }],
      subjects: [voc.id],
      condition: { grade: grade.id },
      images: [{ media: recto }, { media: verso }],
      dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
      ...over,
    })

    const mapBatavia = await publish(
      complete({ title: 'Kaart van Java by François Valentijn', stockNumber: 'M.0500' }),
    )
    const mapSold = await publish(
      complete({
        title: 'Sulawesi chart',
        date: { precision: 'exact', from: 1850 },
        status: 'sold',
        places: [{ place: sulawesi.id, role: 'depicts', primary: true }],
      }),
    )
    const printBatavia = await publish(
      complete({
        title: 'View of the castle',
        objectType: 'print',
        date: { precision: 'circa', from: 1660 },
        makers: [{ maker: luyken.id, role: 'engraver', certainty: 'certain' }],
      }),
    )
    // A work whose Batavia is not its primary place: the place filter still finds it, the
    // place facet's counts do not count it at Batavia.
    const bookSecondary = await publish(
      complete({
        title: 'Journal of a voyage',
        objectType: 'book',
        date: { precision: 'exact', from: 1701 },
        places: [
          { place: sulawesi.id, role: 'depicts', primary: true },
          { place: batavia.id, role: 'depicts', primary: false },
        ],
      }),
    )
    // The draft: never published, carrying a subject of its own no published work shares.
    await stack.api.create({
      collection: 'works',
      data: complete({ title: 'Zeeland house draft', subjects: [zeeland.id] }),
    })

    publishedIds = [mapBatavia, mapSold, printBatavia, bookSecondary].map((work) => Number(work.id))
    const places = await loadPlaces(stack.payload, 'en')
    const ids = new Map(places.map((place) => [place.id, descendantIdsOf(places, place.id)]))
    ctx = { placeIds: (placeId) => ids.get(placeId) ?? [placeId] }
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('the listing loader never selects a price or a staff field', async () => {
    const selectKeys = Object.keys(WORK_CARD_SELECT)
    for (const forbidden of [
      'askingPrice',
      'physicalAcquisitionCost',
      'cataloguing',
      'condition',
      'references',
      'statusReason',
    ]) {
      expect(selectKeys.some((key) => key.toLowerCase().includes(forbidden.toLowerCase()))).toBe(
        false,
      )
    }
    const cards = await projectCards(stack.payload, publishedIds, 'en', 'Date unknown')
    const json = JSON.stringify(cards)
    for (const forbidden of [
      'askingPrice',
      'physicalAcquisitionCost',
      'cataloguing',
      'condition',
      'notes',
    ]) {
      expect(json.includes(forbidden)).toBe(false)
    }
    expect(cards).toHaveLength(publishedIds.length)
  }, 30_000)

  it('a draft work is never listed or counted', async () => {
    const everything = { ...EMPTY_STATE, includeSold: true }
    const listing = await listWorks(stack.payload, everything, ctx, 'en', 'Date unknown')
    expect(listing.total).toBe(publishedIds.length)
    expect(listing.items.map((card) => card.title)).not.toContain('Zeeland house draft')

    const facets = await facetsOf(stack.payload, EMPTY_STATE, ctx, 'en')
    const subjects = facets.find((facet) => facet.key === 'subject')?.options ?? []
    expect(subjects.map((option) => option.label)).not.toContain('Zeeland trade')
  }, 30_000)

  it('facet counts apply every filter but their own', async () => {
    const state: FacetState = { ...EMPTY_STATE, includeSold: true, objectType: ['map'] }
    const facets = await facetsOf(stack.payload, state, ctx, 'en')

    const types = facets.find((facet) => facet.key === 'objectType')?.options ?? []
    const byType = new Map(types.map((option) => [option.value, option.count]))
    // The type facet still counts every type the other filters leave in — print and book are
    // not zeroed by the map filter.
    expect(byType.get('print')).toBe(1)
    expect(byType.get('book')).toBe(1)

    const makers = facets.find((facet) => facet.key === 'maker')?.options ?? []
    const valentijn = makers.find((option) => option.label === 'François Valentijn')
    expect(valentijn?.count).toBe(2) // both maps, even with the filter on maps

    const places = facets.find((facet) => facet.key === 'place')?.places ?? []
    // The place facet applies the map filter (every filter but its own): only the sold chart
    // has Sulawesi as its primary place among the maps.
    const sulawesi = places.find((place) => place.label === 'Sulawesi')
    expect(sulawesi?.count).toBe(1)

    // And with a place filter on, the place facet's counts still answer every other filter
    // only — the type filter is not part of its own counts.
    const withPlace = await facetsOf(
      stack.payload,
      { ...state, objectType: [], place: javaId },
      ctx,
      'en',
    )
    const sulawesiWithPlace =
      withPlace.find((facet) => facet.key === 'place')?.places ?? []
    expect(sulawesiWithPlace.find((place) => place.label === 'Sulawesi')?.count).toBe(2)
  }, 30_000)

  it('place counts roll up to the island group', async () => {
    const facets = await facetsOf(
      stack.payload,
      { ...EMPTY_STATE, includeSold: true },
      ctx,
      'en',
    )
    const places = facets.find((facet) => facet.key === 'place')?.places ?? []
    const java = places.find((place) => place.label === 'Java')
    const batavia = java?.children.find((place) => place.label === 'Batavia')
    expect(batavia?.count).toBe(2)
    expect(java?.count).toBe(2)
    expect(places.find((place) => place.label === 'Sulawesi')?.count).toBe(2)
  }, 30_000)

  it('the listing hides sold works until the visitor asks for them', async () => {
    const shown = await listWorks(stack.payload, EMPTY_STATE, ctx, 'en', 'Date unknown')
    expect(shown.items.map((card) => card.status)).not.toContain('sold')
    expect(shown.total).toBe(3)

    const withSold = await listWorks(
      stack.payload,
      { ...EMPTY_STATE, includeSold: true },
      ctx,
      'en',
      'Date unknown',
    )
    expect(withSold.total).toBe(4)
    expect(withSold.items.map((card) => card.status)).toContain('sold')
  }, 30_000)
})
