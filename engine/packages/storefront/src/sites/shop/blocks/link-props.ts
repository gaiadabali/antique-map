/**
 * A block's link as anchor attributes: its address, and a new tab for a web address off the shop
 * (`noopener noreferrer`, so the opened page cannot reach back).
 */
import type { BlockLink } from '../../../server/shop/pages/blocks'

export function linkProps(link: BlockLink): {
  href: string
  target?: '_blank'
  rel?: string
} {
  return link.external
    ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: link.href }
}
