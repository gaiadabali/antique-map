/**
 * What a maker did (CONTENT-MODEL.md §1 `works.makers.role`, §3 `makers.roles`): the eight C2
 * `MakerRole`s and C12 `SnapshotMaker.role`. A maker's `roles` lists what they are known for; a
 * work's credit (TASKS.md 8.2) names the role on that work, from this same list — import it from
 * here rather than repeating it. C1 holds no constant for it yet (8.1's report, Contracts).
 */
export const MAKER_ROLES = [
  'cartographer',
  'engraver',
  'publisher',
  'author',
  'artist',
  'photographer',
  'studio',
  'printer',
] as const
export type MakerRole = (typeof MAKER_ROLES)[number]

export const MAKER_ROLE_LABELS: Record<MakerRole, string> = {
  cartographer: 'Cartographer',
  engraver: 'Engraver',
  publisher: 'Publisher',
  author: 'Author',
  artist: 'Artist',
  photographer: 'Photographer',
  studio: 'Studio',
  printer: 'Printer',
}
