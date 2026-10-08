import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PublicSiteSettings } from '../server/site-settings'

import { ContactBlock, socialLinks } from './contact-block'
import type { ShellText } from './site'

const t = ((key: string) => `[${key}]`) as unknown as ShellText

function settings(social: PublicSiteSettings['social']): PublicSiteSettings {
  return {
    contact: { whatsapp: null, email: null, phone: null },
    replyPromise: null,
    hours: null,
    announcement: null,
    social,
  }
}

describe('the footer contact block', () => {
  it('links each social account by its platform name', () => {
    const markup = renderToStaticMarkup(
      <ContactBlock
        settings={settings([
          { platform: 'Instagram', url: 'https://www.instagram.com/oldeastindiesart/' },
          { platform: 'Facebook', url: 'https://www.facebook.com/OldEastIndies' },
        ])}
        t={t}
      />,
    )
    expect(markup).toContain('href="https://www.instagram.com/oldeastindiesart/"')
    expect(markup).toContain('>Instagram</a>')
    expect(markup).toContain('href="https://www.facebook.com/OldEastIndies"')
    expect(markup).toContain('rel="me noopener noreferrer"')
  })

  it('keeps the contact placeholder when the settings name no contact', () => {
    const markup = renderToStaticMarkup(
      <ContactBlock
        settings={settings([{ platform: 'Instagram', url: 'https://www.instagram.com/x/' }])}
        t={t}
      />,
    )
    expect(markup).toContain('[shell.contactPlaceholder]')
    expect(markup).toContain('>Instagram</a>')
  })

  it('renders no social list when there are no accounts', () => {
    const markup = renderToStaticMarkup(<ContactBlock settings={settings(null)} t={t} />)
    expect(markup).not.toContain('noopener')
  })

  it('links only https addresses with a host', () => {
    expect(
      socialLinks([
        { platform: 'Instagram', url: 'https://www.instagram.com/oldeastindiesart/' },
        { platform: 'Bad', url: 'javascript:alert(1)' },
        { platform: 'Relative', url: '//evil.example/x' },
        { platform: 'Plain', url: 'http://www.facebook.com/OldEastIndies' },
        { platform: ' ', url: 'https://www.facebook.com/OldEastIndies' },
      ]).map((link) => link.platform),
    ).toEqual(['Instagram'])
  })
})
