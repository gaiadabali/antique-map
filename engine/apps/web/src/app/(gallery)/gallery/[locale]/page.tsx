/** The gallery's home, at placeholder fidelity (`../../../../shell/placeholder-pages`). */
import type { Metadata } from 'next'

import { HomePage } from '../../../../shell/placeholder-pages'
import { homeMetadata } from '../../../../shell/site-root'

export function generateMetadata({ params }: PageProps<'/gallery/[locale]'>): Promise<Metadata> {
  return homeMetadata('gallery', params)
}

export default function GalleryHome({ params }: PageProps<'/gallery/[locale]'>) {
  return <HomePage site="gallery" params={params} />
}
