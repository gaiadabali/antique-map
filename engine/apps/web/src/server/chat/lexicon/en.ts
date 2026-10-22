/**
 * The chat's server-built words in English (AI.md §2.2, §3.3): status lines, canned replies, the
 * handoff buttons and message templates, the consent line and the labels a tool result carries.
 * The model writes none of these. Every key exists in `./id` too (the types make it so).
 * `{site}`, `{topic}`, `{items}`, `{summary}`, `{promise}` are filled by `chatCopy()`.
 */
import 'server-only'

export const EN = {
  'status.search': 'Searching the catalogue',
  'status.item': 'Looking up the item',
  'status.stores': 'Checking our stores',
  'status.delivery': 'Checking delivery',
  'status.handoff': 'Preparing a contact link',
  'status.lead': 'Preparing the contact form',

  'canned.refused':
    'I can’t help with that here, but the team can. Please contact {site} directly using the buttons below.',
  'canned.blocked':
    'I can’t answer that in the chat. The team will be glad to help: please use the buttons below.',
  'canned.abuse': 'I’m here to help with questions about {site}. The team is reachable below.',
  'canned.unavailable':
    'The assistant is unavailable at the moment. Please contact {site} using the buttons below.',
  'canned.price':
    'Prices are given by the gallery on request. Please ask the team directly using the buttons below.',

  'error.rate_limited': 'You’re sending messages quickly. Please wait a moment and try again.',
  'error.budget_exhausted':
    'The assistant is resting for today. Please contact {site} using the buttons below.',
  'error.disabled': 'The assistant is switched off. Please contact {site} using the buttons below.',
  'error.unavailable':
    'The assistant is unavailable at the moment. Please contact {site} using the buttons below.',
  'error.too_long': 'That message is too long. Please keep it under 1,000 characters.',
  'error.session_limit':
    'This conversation has reached its limit. Please continue with the team using the buttons below.',
  'error.session_required': 'Please open the chat again to start a new conversation.',
  'error.challenge_required': 'Please confirm you’re not a robot to continue.',
  'error.bad_request': 'That message could not be read. Please try again.',

  'handoff.whatsapp': 'Continue on WhatsApp',
  'handoff.email': 'Send an email',
  'handoff.greeting': 'Hello {site}, I have a question about {topic}.',
  'handoff.items': 'The item(s):',
  'handoff.summary': 'My question: {summary}',
  'handoff.subject': 'Website enquiry: {topic}',
  'handoff.promise': '{promise}',

  'topic.item_enquiry': 'an item',
  'topic.price': 'the price of an item',
  'topic.sell_to_us': 'selling an item to you',
  'topic.partnership': 'a partnership',
  'topic.order': 'an order',
  'topic.delivery': 'delivery',
  'topic.authenticity': 'an item’s authenticity or value',
  'topic.general': 'your items',

  'consent.text': 'Share these details with {site} so they can contact you about this.',

  'work.available': 'Listed as available',
  'work.on-hold': 'On hold',
  'work.sold': 'Sold',
  'product.inStock': 'In stock',
  'product.outOfStock': 'Out of stock',

  'delivery.gallery':
    'Shipping is arranged and quoted by the gallery with you once a purchase is agreed. No dates or destinations are promised in advance.',
  'delivery.shop':
    'Delivery is from one of our Bali stores, by distance from the store. The fee and any free delivery are calculated at checkout.',
} as const

export type ChatCopyKey = keyof typeof EN
