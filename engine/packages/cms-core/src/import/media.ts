/**
 * An image file a sheet names, as a `media` row (DATA.md §3, §5): found by its filename, else
 * uploaded with its alt text, subject, role and provenance — so a second run links the same row and
 * changes nothing. Used by every kind that carries images (antiques, products).
 */
import { freshReq, type UpsertContext } from './apply'

type Doc = Record<string, unknown> & { id: number }

/** Creates or finds the `media` row for one image file, keyed by filename, alt from the title. */
export async function ensureMedia(
  ctx: UpsertContext,
  fileName: string,
  path: string,
  alt: string,
  subject: 'work' | 'product',
  role: string,
): Promise<number> {
  const { docs } = await ctx.payload.find({
    collection: 'media',
    overrideAccess: true,
    req: await freshReq(ctx),
    depth: 0,
    limit: 1,
    where: { filename: { equals: fileName } },
  })
  if (docs.length > 0) return docs[0]!.id as number
  const created = (await ctx.payload.create({
    collection: 'media',
    data: { alt, subject, role, provenance: 'photograph' } as never,
    filePath: path,
    req: await freshReq(ctx),
  })) as unknown as Doc
  return created.id as number
}
