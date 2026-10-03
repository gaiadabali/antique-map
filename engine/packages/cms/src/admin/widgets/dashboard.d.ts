/**
 * Types for the dashboard widgets' JSX (`./dashboard.jsx`, which the cms package does not
 * type-check — see that file's header). Structural, not imported from Payload's `WidgetServerProps`:
 * `payload/admin/views/dashboard` is not on the package's exports map, so that import cannot resolve.
 */
import type { PayloadRequest } from 'payload'

export type WidgetServerProps = {
  locale?: string | null
  req: PayloadRequest
  user?: unknown
  widgetSlug?: string
}

export function OrdersToActOnWidget(props: WidgetServerProps): Promise<unknown>
export function NewLeadsWidget(props: WidgetServerProps): Promise<unknown>
