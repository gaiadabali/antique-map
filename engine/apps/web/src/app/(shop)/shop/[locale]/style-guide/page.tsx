import type { Metadata } from 'next'

import { StyleGuide } from '../../../../../shared/style-guide/style-guide'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Style guide',
}

export default function ShopStyleGuidePage() {
  return <StyleGuide />
}
