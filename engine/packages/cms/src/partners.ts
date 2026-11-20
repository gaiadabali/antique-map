/**
 * The partner sign-in's password helpers for the shop's server (`packages/storefront/src/server/shop/partners`):
 * the scrypt verify and the hash nothing matches. Hashing a new password stays in the collection's
 * hook (`collections/partners/sign-in`).
 */
export {
  UNMATCHABLE_HASH,
  verifyPartnerPassword,
} from '@engine/cms-shop/collections/partners/partner-password'
