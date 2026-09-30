// The page readers against synthetic fixtures shaped like the old store's
// markup: values come out exactly as printed, labelled — "null", "Leiden",
// "40 b7 22 cm.", an empty colour — for the normalisers (7.2) to judge.
import { describe, expect, it } from 'vitest'

import { discoverUrls, extractCategoryTree, sliceJson } from '../discover.ts'
import { parseListingCards, parseProductPage } from '../parse-pages.ts'
import { createClassifier } from '../urls.ts'
import { ORIGIN, fixture, testConfig } from './helpers.ts'

const config = testConfig()
const pages =
  config.pages ??
  (() => {
    throw new Error('the test config has pages')
  })()

describe('the product page reader', () => {
  it('pairs every panel label with its value, keeping an empty one', () => {
    const page = parseProductPage(fixture('product-listed.html'), pages.product)
    expect(page.heading).toBe('Mock Maker')
    expect(page.fields).toEqual([
      { label: 'Title', value: 'Mock chart - Year 1689' },
      { label: 'Publication Place / Date', value: 'Leiden / 1689' },
      { label: 'Image Dimensions', value: '450 x 380 mm' },
      { label: 'Color', value: '' },
      { label: 'Condition', value: 'G+ / Study image carefully' },
      { label: 'Product Price', value: 'On Request' },
      { label: 'Product Number', value: 'SKU #M.Dav5' },
    ])
    expect(page.longTitle).toBe('Nieuwe Pascaert van Oost Indien (mock long title)')
    expect(page.descriptionHtml).toContain('( Ref: Tooley, R.V. (Australia) 1268. )')
    expect(page.descriptionHtml).not.toContain('mock long title')
    expect(page.sold).toBe(false)
  })

  it('reads a sold page as sold', () => {
    expect(parseProductPage(fixture('product-sold.html'), pages.product).sold).toBe(true)
  })
})

describe('the listing card reader', () => {
  it('reads each card with its categories, maker link, raw fields and sold marker', () => {
    const [first, second] = parseListingCards(fixture('listing.html'), pages.card)
    expect(first).toMatchObject({
      href: `${ORIGIN}/product/101-mock-chart-year-1689`,
      title: 'Mock chart - Year 1689',
      maker: { name: 'Mock Maker', href: `${ORIGIN}/mapmaker/7-mock-maker` },
      price: 'Price on Request',
      sold: false,
    })
    expect(first?.categories.map((category) => category.name)).toEqual([
      'Mock Maps',
      'Mock Islands Maps',
    ])
    expect(first?.fields).toEqual([
      { label: 'Year', value: 'null' },
      { label: 'Size', value: '40 b7 22 cm.' },
      { label: 'Condition', value: 'G+ / Study images carefully' },
      { label: 'SKU', value: 'M.Dav5' },
      { label: 'Price', value: 'Price on Request' },
    ])
    expect(second).toMatchObject({ maker: null, price: null, sold: true })
    expect(second?.fields).toEqual([{ label: 'Year', value: 'Leiden' }])
  })
})

describe('link discovery', () => {
  it('finds anchors, images, viewer images in scripts (unescaped) and the category tree', () => {
    const found = discoverUrls(fixture('product-listed.html'), config.categoryTree)
    const scripted = found.filter((item) => item.via === 'script').map((item) => item.href)
    expect(scripted).toContain(`${ORIGIN}/storage/products/101-501.jpg`)
    expect(scripted).toContain(`${ORIGIN}/storage/products/101-502.jpg`)
    const tree = extractCategoryTree(fixture('listing.html'), {
      variable: 'db',
      pathTemplate: '/c/{id}-{slug}',
    })
    expect(tree.map((category) => [category.id, category.parentId, category.name])).toEqual([
      [1, null, 'Mock Maps [all]'],
      [22, 1, 'Mock "Islands" Maps'],
      [2, null, 'Mock Prints'],
    ])
  })

  it('slices a JSON value with brackets and escaped quotes inside strings', () => {
    const text = 'var x = [{"a":"]\\"}"},[1,2]]; rest'
    expect(sliceJson(text, text.indexOf('['))).toBe('[{"a":"]\\"}"},[1,2]]')
    expect(sliceJson('[1, 2', 0)).toBeNull()
  })

  it('classifies and normalises URLs, and fetches only what carries catalogue content', () => {
    const classifier = createClassifier(config)
    const url = (href: string) => {
      const normalised = classifier.normalise(href, `${ORIGIN}/`)
      if (normalised === null) throw new Error(href)
      return normalised
    }
    const fetched = (href: string) =>
      classifier.isFetched(url(href), classifier.classify(url(href)))
    expect(classifier.classify(url('/product/12-a-b'))).toEqual({
      kind: 'product',
      id: 12,
      slug: 'a-b',
    })
    expect(classifier.classify(url('/storage/products/12-34S.jpg'))).toMatchObject({
      kind: 'image',
      size: 'S',
    })
    expect(url('/category/1-x?s=sold&amp;page=2').href).toBe(`${ORIGIN}/category/1-x?s=sold&page=2`)
    expect(url('http://old-store.example/about-us#top').href).toBe(`${ORIGIN}/about-us`)
    expect(classifier.normalise('https://elsewhere.example/x', ORIGIN)).toBeNull()
    expect(classifier.normalise('mailto:someone@example.invalid', ORIGIN)).toBeNull()
    expect(classifier.normalise('#section', ORIGIN)).toBeNull()
    expect(fetched('/category/1-x?page=3')).toBe(true)
    expect(fetched('/category/1-x?s=sold&page=3')).toBe(true)
    expect(fetched('/category/1-x?s=unsold')).toBe(false)
    expect(fetched('/category/1-x?p=highest')).toBe(false)
    expect(fetched('/storage/products/12-34.jpg')).toBe(true)
    expect(fetched('/storage/products/12-34M.jpg')).toBe(false)
    expect(fetched('/style.css')).toBe(false)
    expect(fetched('/about-us')).toBe(true)
  })
})
