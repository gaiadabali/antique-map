import { describe, expect, it } from 'vitest'

import { PAGE_KIND_LABELS } from './kinds'
import { englishTitle, pagePublishGuard } from './publish-guard'

describe('pages labels', () => {
  it('every page kind label has en and id', () => {
    for (const [kind, labels] of Object.entries(PAGE_KIND_LABELS)) {
      expect(labels, kind).toHaveProperty('en')
      expect(labels, kind).toHaveProperty('id')
    }
  })
})

describe('the pages publish guard', () => {
  const reqIn = (locale: string, stored?: string) =>
    ({
      locale,
      t: ((key: string) => key) as never,
      payload: { findByID: async () => ({ title: stored }) },
    }) as never

  it('reads a one-locale English save, the way the admin saves', async () => {
    expect(await englishTitle('About the gallery', { id: 1 }, reqIn('en'))).toBe(
      'About the gallery',
    )
  })

  it('reads the English entry of an all-locales write', async () => {
    expect(await englishTitle({ en: 'About', id: 'Tentang' }, undefined, reqIn('all'))).toBe(
      'About',
    )
  })

  it('reads the stored English title when publishing in Indonesian', async () => {
    expect(await englishTitle('Tentang', { id: 1 }, reqIn('id', 'About'))).toBe('About')
  })

  it('refuses an English publish with a blank title', async () => {
    await expect(
      pagePublishGuard({
        data: { _status: 'published', title: '  ' },
        originalDoc: { id: 1 },
        req: reqIn('en'),
      } as never),
    ).rejects.toThrow()
  })

  it('lets an English publish with a title through', async () => {
    const data = { _status: 'published', title: 'About' }
    await expect(
      pagePublishGuard({ data, originalDoc: { id: 1 }, req: reqIn('en') } as never),
    ).resolves.toBe(data)
  })
})
