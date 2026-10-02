export const PAGE_KINDS = ['page', 'story', 'collection'] as const
export type PageKind = (typeof PAGE_KINDS)[number]

export const PAGE_KIND_LABELS: Record<PageKind, { en: string; id: string }> = {
  page: { en: 'Page', id: 'Halaman' },
  story: { en: 'Story', id: 'Cerita' },
  collection: { en: 'Collection', id: 'Koleksi' },
}
