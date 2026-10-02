/**
 * Payment methods and failures, the pending page, the payment link, orders, shipments, documents
 * and the guest lookup.
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const PAYMENT_AND_ORDER_KEYS = defineMessages({
  // payment method families (C1 PaymentMethodFamily); a method's brand name is data
  'payment.family.card': 'Card',
  'payment.family.express-wallet': 'Apple Pay or Google Pay',
  'payment.family.paynow': 'PayNow',
  'payment.family.ideal': 'iDEAL',
  'payment.family.sepa-debit': 'SEPA Direct Debit',
  'payment.family.va': 'Virtual account',
  'payment.family.qris': 'QRIS',
  'payment.family.ewallet': 'E-wallet',
  'payment.family.retail': 'Pay at a convenience store',
  'payment.family.paylater': 'Pay later',
  'payment.family.bank-transfer': 'Bank transfer',
  'payment.family.paypal': 'PayPal',
  'payment.family.manual': 'Other arrangement',
  'payment.confirmedAutomatically': 'Confirmed automatically — no receipt to upload',
  // a method routing refuses (C6 method-unavailable.reason)
  'payment.unavailable.amount-cap': '{method} is not available for this amount.',
  'payment.unavailable.not-for-unique-items': '{method} cannot be used for a one-of-one work.',
  'payment.unavailable.provider-unavailable':
    '{method} is unavailable right now. Choose another method.',
  'payment.unavailable.not-offered': '{method} is not offered for this order.',
  'payment.unavailable.window-too-short': '{method} takes longer to confirm than the hold allows.',
  // a payment that did not go through (C6 PaymentFailureClass)
  'payment.failed.declined': 'The payment was declined. Try another method.',
  'payment.failed.expired': 'The time to pay ran out. Choose a method to try again.',
  'payment.failed.cancelled': 'The payment was cancelled. Choose a method to try again.',
  'payment.failed.unavailable': 'That method is unavailable right now. Choose another.',
  'payment.failed.error':
    'The payment provider did not answer. Try again or choose another method.',
  // payment pending (C2 OrderPaymentVM pending; EXPERIENCE-SHOP.md §7)
  'pending.title': 'Waiting for your payment',
  'pending.amount': 'Pay exactly {amount}',
  'pending.vaNumber': 'Virtual account number',
  'pending.copy': 'Copy',
  'pending.copied': 'Copied',
  'pending.howToPay': 'How to pay with {bank}',
  'pending.payBy': 'Pay by {date}',
  'pending.saveQr': 'Save QR to gallery',
  'pending.openApp': 'Open {app}',
  'pending.dailyCap': 'Some banks limit transfers per day.',
  'pending.autoSwitch': 'This page turns to Paid by itself when the payment arrives.',
  'pending.inAppBrowser': 'This step cannot finish inside {app}. Open this page in your browser.',
  'pending.transfer': 'Transfer {amount} to the account below, quoting {reference}.',
  // the payment link (C2 PayVM; PAYMENTS.md, /pay/{token})
  'pay.title': 'Your payment link',
  'pay.soldBy': 'Sold by {seller}',
  'pay.amountDue': 'Amount due',
  'pay.linkValidUntil': 'This link works until {date}',
  'pay.expired': 'This payment link has expired. Message us for a new one.',
  'pay.cancelled': 'This payment link was cancelled.',
  'pay.paid': 'This link has been paid. Thank you.',
  // the buyer's order status (C6 BuyerOrderStatus)
  'order.title': 'Order {number}',
  'order.status.awaiting-payment': 'Awaiting payment',
  'order.status.not-paid': 'Not paid',
  'order.status.paid': 'Paid',
  'order.status.shipped': 'Shipped',
  'order.status.ready-for-pickup': 'Ready for pickup',
  'order.status.completed': 'Completed',
  'order.status.cancelled': 'Cancelled',
  'order.status.refunded': 'Refunded',
  'order.soldBy': 'Sold by {seller}',
  'order.track': 'Track your parcel',
  'order.pickupCode': 'Pickup code: {code}',
  'order.whoMayCollect': '{name} may collect this order.',
  'order.reportProblem': 'Report a problem',
  // shipment status (C6 ShipmentStatus)
  'shipment.label-created': 'Label created',
  'shipment.ready-for-pickup': 'Ready for pickup',
  'shipment.picked-up': 'Picked up by the courier',
  'shipment.in-transit': 'In transit',
  'shipment.out-for-delivery': 'Out for delivery',
  'shipment.delivered': 'Delivered',
  'shipment.collected': 'Collected',
  'shipment.exception': 'Delivery problem — being looked into',
  'shipment.returned-to-sender': 'Returned to sender',
  // documents (C2 DocumentKind)
  'document.confirmation': 'Order confirmation',
  'document.proforma': 'Proforma invoice',
  'document.receipt': 'Receipt',
  'document.certificate': 'Certificate of authenticity',
  'document.commercial-invoice': 'Commercial invoice',
  // guest order lookup (C2 OrderLookupVM)
  'orderLookup.title': 'Track an order',
  'orderLookup.number': 'Order number',
  'orderLookup.contact': 'The email or WhatsApp number you ordered with',
  'orderLookup.submit': 'Find my order',
  'orderLookup.notFound': 'No order matches those details. Check both and try again.',
})
