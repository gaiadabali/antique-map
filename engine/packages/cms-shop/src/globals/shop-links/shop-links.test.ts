import { describe, expect, it } from 'vitest'

import { ShopFooter } from '../shop-footer'
import { ShopHeader } from '../shop-header'
import { LINK_URL, SHOP_CHROME_ACCESS } from '.'

const asRole = (role: string | null) =>
  ({ req: { user: role === null ? null : { collection: 'users', role } } }) as never

describe('shop-header and shop-footer', () => {
  it('let the owner and the editors read and write them, and nobody else', () => {
    for (const [role, allowed] of [
      ['owner', true],
      ['editor', true],
      ['store', false],
      [null, false],
    ] as const) {
      expect(SHOP_CHROME_ACCESS.read(asRole(role)), String(role)).toBe(allowed)
      expect(SHOP_CHROME_ACCESS.update(asRole(role)), String(role)).toBe(allowed)
    }
    expect(ShopHeader.access).toBe(SHOP_CHROME_ACCESS)
    expect(ShopFooter.access).toBe(SHOP_CHROME_ACCESS)
  })

  it('have no drafts: a save is live', () => {
    expect(ShopHeader.versions).toBeUndefined()
    expect(ShopFooter.versions).toBeUndefined()
  })

  it('open a menu link just added unfolded (no initCollapsed on a link list)', () => {
    const menu = ShopHeader.fields.find((f) => 'name' in f && f.name === 'mainMenu')
    expect(menu?.admin && 'initCollapsed' in menu.admin).toBe(false)
  })

  it('takes https, mailto, tel and paths on the site as web addresses, and nothing else', () => {
    for (const url of [
      'https://www.instagram.com/oldeastindiesart/',
      'mailto:hello@oldeastindies.com',
      'tel:+62 812 3456 7890',
      '/collections/maps',
      '/',
    ]) {
      expect(LINK_URL.test(url), url).toBe(true)
    }
    for (const url of [
      'javascript:alert(1)',
      '//elsewhere.example',
      'http://plain.example',
      'collections',
      'https://with space.example',
    ]) {
      expect(LINK_URL.test(url), url).toBe(false)
    }
  })
})
