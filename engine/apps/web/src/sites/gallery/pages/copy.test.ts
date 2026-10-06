/**
 * The CMS pages' chrome words (5.4.b): every key this module defines is in both lexicons, and
 * reads through `cmsPageText()` in each locale.
 */
import { describe, expect, it } from 'vitest'

import en from '../lexicon/en.json'
import id from '../lexicon/id.json'

import { CMS_PAGE_KEYS, cmsPageText } from './copy'

describe('cms page copy', () => {
  it('every key this module defines is in both locales', () => {
    for (const key of Object.keys(CMS_PAGE_KEYS)) {
      expect(en, `en missing ${key}`).toHaveProperty([key])
      expect(id, `id missing ${key}`).toHaveProperty([key])
    }
  })

  it('reads the works heading in each locale', () => {
    expect(cmsPageText('en')('cmsPage.worksHeading')).toBe('Works in this story')
    expect(cmsPageText('id')('cmsPage.worksHeading')).toBe('Karya dalam cerita ini')
  })
})
