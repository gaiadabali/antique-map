/**
 * Payload's own page frame — the sidebar, the header, the account menu — around a custom admin
 * view (the order panel, the leads inbox, the stock import). A root custom view renders bare
 * unless it wraps itself in `DefaultTemplate` (Payload 3.90, `@payloadcms/next/templates`), so
 * staff who opened one had no way back but the browser's (10.8 CI run: the store user's landing
 * page had no sidebar). `.jsx`: see `./leads/shared.jsx`'s header.
 */
import { DefaultTemplate } from '@payloadcms/next/templates'

export function AdminPage({ view, children }) {
  const result = view?.initPageResult
  if (!result?.req) return children
  return (
    <DefaultTemplate
      i18n={result.req.i18n}
      locale={result.locale}
      params={view.params}
      payload={result.req.payload}
      permissions={result.permissions}
      searchParams={view.searchParams}
      user={result.req.user ?? undefined}
      visibleEntities={result.visibleEntities}
    >
      {children}
    </DefaultTemplate>
  )
}
