/** Types for `./view.jsx`: structural; Payload hands a dashboard view its page result and search params. */
export type CatalogueWallProps = {
  readonly initPageResult?: {
    readonly req?: { readonly user?: unknown; readonly payload?: unknown; readonly i18n?: unknown }
    readonly locale?: { readonly code?: string } | null
  }
  readonly searchParams?: Record<string, string | string[] | undefined>
  readonly user?: unknown
}

export function CatalogueWall(props: CatalogueWallProps): Promise<unknown>
