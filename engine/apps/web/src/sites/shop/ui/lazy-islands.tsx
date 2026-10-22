'use client'

/**
 * The shop's page-bound client islands (the enquiry and sign-in forms, the stores' area nav),
 * each loaded on demand: its code (and the shared UI it pulls in) is its own chunk, fetched only
 * by a page that draws it, so it stays out of the scripts of every page that merely can (the home
 * renders blocks from the same map). Server-rendered as before; props are unchanged.
 */
import dynamic from 'next/dynamic'

export const PartnershipForm = dynamic(() =>
  import('../partnership/partnership-form').then((module) => module.PartnershipForm),
)
export const SignInForm = dynamic(() =>
  import('../partnership/sign-in-form').then((module) => module.SignInForm),
)
export const AreaNav = dynamic(() => import('../stores/area-nav').then((module) => module.AreaNav))
