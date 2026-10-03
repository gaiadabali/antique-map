'use server'

/**
 * The add-to-bag placeholder (6.1.b): the variant picker posts here so the page's buy path is
 * wired end to end, and 6.2's bag replaces this stub — it writes nothing, prices nothing and
 * holds nothing (the bag is the server's, COMMERCE.md §3). The button stays disabled while the
 * product is out of stock, so the stub never fires for one.
 */
export type AddToBagInput = {
  readonly sku: string
  readonly variantSku: string | null
  readonly qty: number
}

export type AddToBagResult = { readonly ok: false; readonly reason: 'not-built-yet' }

export async function addToBagPlaceholder(input: AddToBagInput): Promise<AddToBagResult> {
  void input
  return { ok: false, reason: 'not-built-yet' }
}
