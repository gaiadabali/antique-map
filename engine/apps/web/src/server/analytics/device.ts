/**
 * `deviceClass` from the user agent (ANALYTICS.md §2): `mobile` · `tablet` · `desktop`. A coarse
 * read, not a fingerprint — the string is dropped after this and after the session hash.
 */

const TABLET = /ipad|tablet|playbook|silk|kindle/i
const MOBILE =
  /mobi|iphone|ipod|android(?!.*tablet)|windows phone|blackberry|opera mini|opera moble/i

export function deviceClass(userAgent: string | null | undefined): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent ?? ''
  if (TABLET.test(ua)) return 'tablet'
  if (MOBILE.test(ua)) return 'mobile'
  return 'desktop'
}
