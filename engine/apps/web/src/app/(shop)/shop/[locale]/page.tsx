/** The shop's home, at placeholder fidelity (`../../../../shell/placeholder-pages`). */
import type { Metadata } from 'next'

import { HomePage } from '../../../../shell/placeholder-pages'
import { homeMetadata } from '../../../../shell/site-root'

export function generateMetadata({ params }: PageProps<'/shop/[locale]'>): Promise<Metadata> {
  return homeMetadata('shop', params)
}

export default function ShopHome({ params }: PageProps<'/shop/[locale]'>) {
  return <HomePage site="shop" params={params} />
}
