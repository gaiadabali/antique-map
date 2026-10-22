/**
 * The blocks a shop page is built from, in the order the admin's "Add block" menu lists them:
 * the home's sections, the partnership page's, then the general ones any page may use.
 */
import type { Block } from 'payload'

import { CONTENT_BLOCKS } from './content'
import { HOME_BLOCKS } from './home'
import { PARTNERSHIP_BLOCKS } from './partnership'

export const SHOP_BLOCKS: Block[] = [...HOME_BLOCKS, ...PARTNERSHIP_BLOCKS, ...CONTENT_BLOCKS]

export const SHOP_BLOCK_SLUGS = SHOP_BLOCKS.map((block) => block.slug)
