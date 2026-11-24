/**
 * `@engine/site/shell`: the shell's parts both sites draw the same way (PLAN-V2 §4.2) — the brand
 * link and language switcher, the owner's announcement, the chat panel's contact links and the
 * nav and social-link rules. The page frame's global stylesheet is `@engine/site/site.css`.
 */
export { Announcement } from './announcement'
export { chatContact } from './chat-contact'
export { BrandLink, LocaleSwitcher, type ShellFrame } from './frame'
export { isCurrent, socialLinks } from './nav'
export type { ShellT } from './text'
