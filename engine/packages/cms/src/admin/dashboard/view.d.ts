/**
 * Types for the dashboard view's JSX (`./view.jsx`, which the cms package does not type-check —
 * see `../widgets/dashboard.jsx`). Structural, as `../widgets/dashboard.d.ts` is.
 */
import type { PayloadRequest } from 'payload'

export type DashboardViewProps = {
  initPageResult?: { req?: PayloadRequest }
  searchParams?: Record<string, string | string[] | undefined>
}

export function DashboardView(props: DashboardViewProps): Promise<unknown>
