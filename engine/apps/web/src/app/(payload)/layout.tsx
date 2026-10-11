/**
 * Payload's admin mount (C13): the one place in this app that imports Payload (eslint boundary 1).
 * Its root layout is Payload's own; the storefront's is `(site)/[locale]/layout.tsx`. The config
 * is the one brand-independent `@engine/cms` config — importing it touches no database.
 *
 * The admin wears the Indies world (TASKS.md 16): the brand's faces on `<html>` (next/font, served
 * from our own origin), the shared primitives, the admin's tokens, then its stylesheets — after
 * Payload's own CSS, and unlayered, so they win over `@layer payload-default`.
 */
import '@payloadcms/next/css'
import '../../shared/styles/tokens/primitives.css'
import '../../shared/styles/tokens/admin.css'
import './admin/theme-base.css'
import './admin/theme-shell.css'
import './admin/theme-forms.css'
import './admin/theme-lists.css'
import './admin/wall.css'
import './admin/panels.css'

import config from '@engine/cms/payload.config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'

import { fontVariables } from '../../shared/styles/fonts'

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
