/**
 * Payload's admin mount (C13): the one place in this app that imports Payload (eslint boundary 1).
 * Its root layout is Payload's own; the storefront's is `(site)/[locale]/layout.tsx`. The config
 * is the one brand-independent `@engine/cms` config — importing it touches no database.
 */
import '@payloadcms/next/css'

import config from '@engine/cms/payload.config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import { importMap } from './admin/importMap.js'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

export default function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}
