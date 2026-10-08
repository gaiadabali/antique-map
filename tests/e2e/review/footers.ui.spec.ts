/** 10.6.f clause 6: both footers link the right Instagram and Facebook (exact hrefs, `rel` has noopener), en and id, both widths. */
import { expect, test } from '@playwright/test'

import { GALLERY, SHOP } from './support'

const SITES = [
  {
    name: 'gallery',
    origin: GALLERY,
    instagram: 'https://www.instagram.com/indiesgalleryantiques/',
    facebook: 'https://www.facebook.com/IndiesGallery/',
  },
  {
    name: 'shop',
    origin: SHOP,
    instagram: 'https://www.instagram.com/oldeastindiesart/',
    facebook: 'https://www.facebook.com/OldEastIndies',
  },
] as const

for (const site of SITES) {
  for (const path of ['/', '/id']) {
    test(`${site.name} ${path} footer links the right Instagram and Facebook`, async ({ page }) => {
      const res = await page.goto(`${site.origin}${path}`, { waitUntil: 'load' })
      expect(res?.status()).toBe(200)
      const footer = page.locator('footer')
      for (const [label, href] of [
        ['Instagram', site.instagram],
        ['Facebook', site.facebook],
      ] as const) {
        const links = footer.locator(`a[href^="https://www.${label.toLowerCase()}.com/"]`)
        await expect(links, `${label} links in the footer`).toHaveCount(1)
        await expect(links.first()).toHaveAttribute('href', href)
        await expect(links.first()).toHaveAttribute('rel', /noopener/)
        await expect(links.first()).toHaveText(label)
      }
    })
  }
}
