import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CatalogueImage, ProductVM } from '../../../server/shop/catalogue/view-models'
import { ProductCard } from '../browse/product-card'
import { ProductView } from './product-view'

// The shared shell imports `server-only`; a unit test renders without a server.
vi.mock('server-only', () => ({}))

const image = (extra: Partial<CatalogueImage> = {}): CatalogueImage => ({
  url: 'https://media.example.test/a/640.webp',
  alt: 'A framed map',
  width: 640,
  height: 480,
  syntheticLabel: null,
  ...extra,
})

const product = (images: readonly CatalogueImage[]): ProductVM => ({
  id: 1,
  slug: 'exotic-bali-1930s',
  name: 'Exotic Bali',
  sku: 'EB-1',
  description: '',
  price: 100000,
  images,
  variants: [],
  category: null,
  relatedWork: null,
  available: true,
})

const view = (images: readonly CatalogueImage[]): string =>
  renderToStaticMarkup(
    <ProductView product={product(images)} locale="en" shopHref="/shop" categoryHref={null} />,
  )

describe('the product page labels a synthetic image', () => {
  it('shows the label and prefixes the alt for a mock-up', () => {
    const markup = view([image({ syntheticLabel: 'digital-mockup' })])
    expect(markup).toContain('<figcaption')
    expect(markup).toContain('>Digital mockup</figcaption>')
    expect(markup).toContain('alt="Digital mockup: A framed map"')
  })

  it('labels a non-lead mock-up and an AI image too', () => {
    const markup = view([
      image(),
      image({ url: 'https://media.example.test/b/640.webp', syntheticLabel: 'ai-generated' }),
    ])
    expect(markup).toContain('>AI-generated image</figcaption>')
    expect(markup).toContain('alt="AI-generated image: A framed map"')
    expect(markup).toContain('alt="A framed map"')
  })

  it('shows neither for a photograph', () => {
    const markup = view([image()])
    expect(markup).not.toContain('<figcaption')
    expect(markup).not.toContain('Digital mockup')
    expect(markup).toContain('alt="A framed map"')
  })

  it('says it in Indonesian too', () => {
    const markup = renderToStaticMarkup(
      <ProductView
        product={product([image({ syntheticLabel: 'digital-mockup' })])}
        locale="id"
        shopHref="/shop"
        categoryHref={null}
      />,
    )
    expect(markup).toContain('Mockup digital: A framed map')
  })
})

describe('the listing card labels a synthetic lead image', () => {
  const card = (lead: CatalogueImage) =>
    renderToStaticMarkup(
      <ProductCard
        product={{
          id: 1,
          slug: 'exotic-bali-1930s',
          name: 'Exotic Bali',
          sku: 'EB-1',
          price: 100000,
          fromPrice: null,
          image: lead,
          category: null,
          available: true,
        }}
        locale="en"
        href="/product/exotic-bali-1930s"
      />,
    )

  it('prefixes the alt and shows the short label for a mock-up', () => {
    const markup = card(image({ syntheticLabel: 'digital-mockup' }))
    expect(markup).toContain('alt="Digital mockup: A framed map"')
    expect(markup).toContain('>Digital mockup</span>')
  })

  it('renders the ladder and an accurate sizes', () => {
    const markup = card(
      image({
        srcSet: 'https://m/320.webp 320w, https://m/640.webp 640w',
        url: 'https://m/640.webp',
      }),
    )
    expect(markup).toContain('srcSet="https://m/320.webp 320w, https://m/640.webp 640w"')
    expect(markup).toContain('sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"')
  })

  it('adds nothing for a photograph', () => {
    const markup = card(image())
    expect(markup).toContain('alt="A framed map"')
    expect(markup).not.toContain('Digital mockup')
  })
})
