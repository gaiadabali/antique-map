/**
 * The shell's message keys and their neutral defaults, shared by both sites (PLAN-V2 §4.2: shared
 * keys in `@engine/i18n`): the skip link, the brand link, the language switcher, the menu, the
 * contact and legal lines, the footers' links, the placeholder home and the 404. Each site's
 * lexicon holds their values (CONVENTIONS.md §6).
 */
import { defineMessages } from './messages'

export const SHELL_MESSAGES = defineMessages({
  'shell.skipToContent': 'Skip to content',
  'shell.homeLink': '{brand}, home',
  'shell.languages': 'Language',
  'shell.locale.en': 'English',
  'shell.locale.id': 'Bahasa Indonesia',
  'shell.chat': 'Chat with us',
  'shell.menu': 'Main menu',
  'shell.menu.open': 'Open menu',
  'shell.menu.close': 'Close menu',
  'shell.contact': 'Contact',
  'shell.whatsapp': 'Ask on WhatsApp',
  'shell.email': 'Email',
  'shell.phone': 'Phone',
  'shell.newTab': '{label} (opens in a new tab)',
  'shell.hours': 'Hours',
  'shell.replyPromise': 'Reply promise',
  'shell.announcement': 'Announcement',
  'shell.sister': 'Our sister site',
  'shell.privacy': 'Privacy',
  'shell.terms': 'Terms',
  'shell.contactPlaceholder':
    'Our contact details are being added. Please check back soon — or write to us from any page.',
  'nav.collection': 'Collection',
  'nav.makers': 'Makers',
  'nav.places': 'Places',
  'nav.stories': 'Stories',
  'nav.sellToUs': 'Sell to us',
  'nav.shop': 'Shop',
  'nav.collections': 'Collections',
  'nav.stores': 'Stores',
  'nav.articles': 'Articles',
  'nav.partnership': 'Partnership',
  'footer.collection': 'The collection',
  'footer.makers': 'Makers',
  'footer.places': 'Places',
  'footer.stories': 'Stories',
  'footer.sellToUs': 'Sell to us',
  'footer.about': 'About us',
  'footer.contact': 'Contact',
  'footer.shop': 'Shop prints',
  'footer.collections': 'Gallery walls',
  'footer.stores': 'Where to buy',
  'footer.partnership': 'Partnership',
  'footer.delivery': 'Delivery',
  'footer.faq': 'Frequently asked',
  'footer.title.about': 'About',
  'footer.title.explore': 'Explore',
  'footer.title.shop': 'Shop',
  'home.title': '{brand}',
  'home.lede': 'This site is being built. What you see is its frame.',
  'notFound.title': 'Page not found',
  'notFound.body': 'There is nothing at this address.',
  'notFound.home': 'Go to the home page',
})

export type ShellMessageKey = keyof typeof SHELL_MESSAGES
