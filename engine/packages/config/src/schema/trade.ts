/**
 * @contract C1 — brand config: the retail partners' trade terms · owner: ARC · entry: `@engine/config/schema`
 *
 * `commerce.trade` (D31, D32, D33): the price tiers an approved retailer's quotes are priced
 * at (C5 `TradeTerms`), the tier approval assigns, how far a tier may go, and who may waive a
 * quote's minimum. The file is the floor; only an owner-role CMS user (`admin`, C1
 * `STAFF_ROLES`) may override the tiers, every change audited, and an editor never can (D33).
 * An override that removes a tier some retailer still holds is refused, unless the same
 * audited change moves those retailers to another tier; no tier, in the file or an override,
 * passes `maxDiscountBps`. Staff assign each approved retailer a tier — `defaultTier` at
 * approval — and only the server resolves it, for that retailer's own quotes.
 */
import { z } from 'zod'

import { staffRoleSchema } from './accounts'
import { idSchema, positiveMoneySchema } from './primitives'

const bpsSchema = z.int().min(0).max(9999)

/**
 * A tier's minimum order, as C5's `TradeMinimum` holds it: goods worth `amount` at the prices
 * paid, in the currency the seller quotes its retailers in — or `pieces` of each design, its
 * sizes and formats counted together when `mixedSizes`.
 */
export const tradeMinimumSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('amount'), amount: positiveMoneySchema }),
  z.strictObject({
    kind: z.literal('piecesPerDesign'),
    pieces: z.int().positive(),
    mixedSizes: z.boolean(),
  }),
])

/** A trade price tier: basis points off the market list (4000 is 40 % off), and its minimum. */
export const tradeTierSchema = z.strictObject({
  id: idSchema,
  discountBps: bpsSchema,
  minimum: tradeMinimumSchema,
})
export type TradeTierConfig = z.infer<typeof tradeTierSchema>

/**
 * Who may issue a quote below its minimum, for that one quote, the waiver recorded on it (C6):
 * `admin`, and `role` if it is another; `maxShortfallBps` is how far below the minimum, in
 * basis points of it (`null`: any shortfall). `null` for the whole: no one waives.
 */
export const tradeWaiverSchema = z.strictObject({
  role: staffRoleSchema,
  maxShortfallBps: z.int().min(1).max(10000).nullable(),
})

export const tradeConfigSchema = z
  .strictObject({
    tiers: z.array(tradeTierSchema).min(1),
    defaultTier: idSchema,
    /** The owner's ceiling on any tier's discount — here and in a CMS override; `null`: none. */
    maxDiscountBps: bpsSchema.nullable().default(null),
    waiver: tradeWaiverSchema.nullable().default(null),
  })
  .superRefine((trade, ctx) => {
    const ids = trade.tiers.map((tier) => tier.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['tiers'], message: 'tier ids must be unique' })
    }
    if (!ids.includes(trade.defaultTier)) {
      ctx.addIssue({ code: 'custom', path: ['defaultTier'], message: 'not one of the tiers' })
    }
    const ceiling = trade.maxDiscountBps
    trade.tiers.forEach((tier, i) => {
      if (ceiling !== null && tier.discountBps > ceiling) {
        const message = `a discount above maxDiscountBps (${ceiling})`
        ctx.addIssue({ code: 'custom', path: ['tiers', i, 'discountBps'], message })
      }
    })
  })
export type TradeConfig = z.infer<typeof tradeConfigSchema>
