/**
 * CI only: publishes the shop layer's mock products so the shop specs have a live catalogue.
 *
 * `pnpm data:seed --layer shop` loads 80 mock products as drafts and refuses `--publish`, because a
 * product needs a picture to publish ("Add at least one image before publishing") and the mock
 * rows carry none; the real catalogue (`shop-catalogue`) needs the owner's private files, which CI
 * has not. So this script gives every draft product one already-seeded media row (the gallery
 * sample's first image; run `gallery-sample` first) and publishes it through the Local API.
 *
 * Run by e2e.yml with `payload run` from the cms package, against the database `DATABASE_URL`
 * names. Idempotent: it only touches products still in draft. Every write hands its cache tags to
 * the CLI collector (`import/cli-cache`), as `admin/fixtures.ts` does: outside a request the cache
 * hooks' `after()` throws.
 */
type Doc = Record<string, unknown> & { id: number }
type Api = {
  find(args: object): Promise<{ docs: Doc[]; totalDocs: number }>
  update(args: object): Promise<Doc>
  destroy(): Promise<void>
}

async function main(): Promise<void> {
  process.env.PAYLOAD_SECRET ??= 'e2e-publish-shop-dev-only-never-signs-anything'
  const { cms } = await import('../../../engine/packages/cms/src/instance')
  const { cliInvalidation } = await import('../../../engine/packages/cms/src/import/cli-cache')
  const payload = (await cms()) as unknown as Api
  const batch = cliInvalidation()

  const media = (await payload.find({ collection: 'media', limit: 1, depth: 0, sort: 'id' }))
    .docs[0]
  if (!media) throw new Error('no media row: seed the gallery-sample layer first')

  const drafts = await payload.find({
    collection: 'products',
    where: { and: [{ _status: { equals: 'draft' } }, { sku: { like: 'SEED-SHOP-' } }] },
    draft: true,
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  let published = 0
  let repriced = false
  for (const product of drafts.docs) {
    // The mock variants all cost what their product does; the product-page spec needs one product
    // whose variants differ in price (the picker changes the price), so the first product with two
    // or more variants gets its second variant dearer. Test data shaping, CI only.
    const variants = Array.isArray(product.variants)
      ? (product.variants as { price?: number | null }[])
      : []
    const reprice = !repriced && variants.length >= 2 && typeof product.price === 'number'
    if (reprice) {
      repriced = true
      variants[1] = {
        ...variants[1],
        price: (variants[1]?.price ?? (product.price as number)) + 100_000,
      }
    }
    await payload.update({
      collection: 'products',
      id: product.id,
      data: {
        images: [{ image: media.id }],
        ...(reprice ? { variants } : {}),
        _status: 'published',
      },
      overrideAccess: true,
      context: batch.context(),
    })
    published += 1
  }
  console.log(`E2E_PUBLISHED_PRODUCTS ${published}`)
  await payload.destroy()
}

// Awaited at the top: `payload run` ends the process once the module has evaluated.
try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
