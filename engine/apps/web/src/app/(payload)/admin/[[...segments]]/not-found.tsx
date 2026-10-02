import config from '@engine/cms/payload.config'
import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views'
import type { Metadata } from 'next'

import { importMap } from '../importMap.js'

type Args = {
  readonly params: Promise<{ segments: string[] }>
  readonly searchParams: Promise<Record<string, string | string[]>>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

export default function NotFound({ params, searchParams }: Args) {
  return NotFoundPage({ config, importMap, params, searchParams })
}
