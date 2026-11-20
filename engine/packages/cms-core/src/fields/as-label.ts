/**
 * A refusal's `label`, which Payload lists in the refusal's message and the admin's toast shows
 * item by item, split at commas: the field's name and the message, its commas made dashes.
 */
export const asLabel = (name: string, message: string) =>
  `${name} — ${message.replace(/\.$/, '').replace(/,/g, ' —')}`
