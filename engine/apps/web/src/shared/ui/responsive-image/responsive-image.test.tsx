/**
 * The derivative ladder (5.5 Lighthouse follow-up): a remote image given its `srcSet` keeps it, so
 * the browser fetches the rung its slot needs; without one the image renders as before.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ResponsiveImage } from './responsive-image'

const BASE = 'https://media.example.test/derivatives/v1/abc'
const SRC_SET = `${BASE}/320.webp 320w, ${BASE}/640.webp 640w, ${BASE}/1024.webp 1024w`

describe('ResponsiveImage with a derivative ladder', () => {
  it('keeps the ladder and the sizes, lazy by default', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveImage
        variant="fill"
        aspectRatio="1 / 1"
        src={`${BASE}/1024.webp`}
        srcSet={SRC_SET}
        alt="A map of Java"
        sizes="(min-width: 768px) 15vw, calc(50vw - 3rem)"
      />,
    )
    expect(markup).toContain(`srcSet="${SRC_SET}"`)
    expect(markup).toContain('sizes="(min-width: 768px) 15vw, calc(50vw - 3rem)"')
    expect(markup).toContain(`src="${BASE}/1024.webp"`)
    expect(markup).toContain('alt="A map of Java"')
    expect(markup).toContain('loading="lazy"')
    expect(markup).not.toContain('fetchPriority')
    expect(markup).not.toContain('/_next/image')
  })

  it('fetches a lead image eagerly, at high priority', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveImage
        variant="fixed"
        width={1024}
        height={768}
        src={`${BASE}/1024.webp`}
        srcSet={SRC_SET}
        alt="A map of Java"
        sizes="100vw"
        priority
      />,
    )
    expect(markup).toContain(`srcSet="${SRC_SET}"`)
    expect(markup).toContain('fetchPriority="high"')
    expect(markup).not.toContain('loading="lazy"')
  })

  it('renders as before without a ladder', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveImage
        variant="fill"
        aspectRatio="1 / 1"
        src={`${BASE}/1024.webp`}
        alt="A map of Java"
        sizes="50vw"
      />,
    )
    expect(markup).toContain(`src="${BASE}/1024.webp"`)
    expect(markup).not.toContain('srcSet')
  })
})
