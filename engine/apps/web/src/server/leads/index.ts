/**
 * The lead service (TASKS.md 9.1.c). The chat's hand-off (5.3.c) reuses `createLead` and
 * `notifyNewLead`. `./deps` (the real adapters) is imported by its callers directly, so the pure
 * service here loads without Payload.
 */
export { createLead, type CreateLeadResult, type LeadRequest } from './create-lead'
export {
  LEAD_ERROR_KEYS,
  LEAD_LIMITS,
  parseLeadInput,
  type LeadContext,
  type LeadInput,
  type LeadParse,
} from './input'
export { notifyNewLead, type LeadMailer } from './notify'
export type { LeadDeps, NewLeadNotice, NewLeadRecord } from './ports'
export { LEAD_POSTS_PER_MINUTE, PostLimiter } from './rate'
