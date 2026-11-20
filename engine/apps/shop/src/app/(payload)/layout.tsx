/**
 * The shop's admin mount (C13): Payload's own root layout over the shop's CMS
 * (`@engine/cms-shop/payload.config`) — importing it touches no database. The admin wears the
 * Indies world as today's does: the brand's faces on `<html>` (next/font, served from our own
 * origin), the shared primitives and the admin's tokens, then the admin's theme
 * (`@engine/ui/admin/*`) — after Payload's own CSS, and unlayered, so they win over
 * `@layer payload-default`.
 */
import '@payloadcms/next/css'
import '@engine/ui/tokens/primitives.css'
import '@engine/ui/tokens/admin.css'
import '@engine/ui/admin/theme-base.css'
import '@engine/ui/admin/theme-shell.css'
import '@engine/ui/admin/theme-signin.css'
import '@engine/ui/admin/theme-forms.css'
import '@engine/ui/admin/theme-record.css'
import '@engine/ui/admin/theme-lists.css'
import '@engine/ui/admin/panels.css'

import config from '@engine/cms-shop/payload.config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import { fontVariables } from '@engine/ui/fonts'

import { importMap } from './admin/importMap.js'

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

export default function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <RootLayout
      config={config}
      htmlProps={{ className: fontVariables }}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  )
}
