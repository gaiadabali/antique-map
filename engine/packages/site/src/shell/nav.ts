/**
 * The header's and footer's links, as both sites mark them: the current page is the public path the
 * proxy hands the request (`x-public-path`), and a link is current on its page or one beneath it.
 * Only an `https:` social address becomes a link: the field is free text.
 */
import type { PublicSiteSettings } from '../site-settings'

/** True when `path` is the link's page or one beneath it. */
export function isCurrent(path: string | null, target: string): boolean {
  if (path === null) return false
  const here = path.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? ''
  const there = target.replace(/\/+$/, '')
  // The home (`/`) is current on the home alone, not on every page beneath it.
  if (there === '') return here === ''
  return here === there || here.startsWith(`${there}/`)
}

/** Only an `https:` address becomes a link: the field is free text, so no `javascript:` or `//host`. */
export function socialLinks(
  social: PublicSiteSettings['social'],
): readonly { platform: string; url: string }[] {
  return (social ?? []).filter(
    (link) => link.platform.trim() !== '' && /^https:\/\/[^/\s]+\.[^/\s]+/i.test(link.url),
  )
}
