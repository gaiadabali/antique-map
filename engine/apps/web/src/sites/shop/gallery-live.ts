/**
 * The owner's current gallery site. Until the new Indies Gallery launches, every shop link to the
 * gallery (the footer's bridge, the home's originals, a product's original) goes here, in a new
 * tab; then each goes back to `siteHref('gallery')` / the related work's own address.
 */
export const GALLERY_LIVE = 'https://antiquemapsindonesia.com/'

/** The attributes a link to the live gallery carries: its address, a new tab, no opener. */
export const GALLERY_LIVE_LINK = {
  href: GALLERY_LIVE,
  target: '_blank',
  rel: 'noopener noreferrer',
} as const
