/**
 * The admin's words for C9's value lists (`@engine/media/contract`): the values are the
 * contract's, in its order; only the labels are written here. A value the contract adds without a
 * label here still shows, as its own name, and a test says which ones lack one.
 */
import {
  CAPTURE_TIERS,
  INTAKE_VERDICTS,
  MEDIA_PROVENANCES,
  MEDIA_ROLES,
  RETOUCHING_STATES,
} from '@engine/media/contract'

export type Option = { readonly label: string | { en: string; id: string }; readonly value: string }

export function optionsOf(
  values: readonly string[],
  labels: Readonly<Record<string, string | { en: string; id: string }>>,
): Option[] {
  return values.map((value) => {
    const label = labels[value] ?? value
    return {
      value,
      label: typeof label === 'string' ? { en: label, id: label } : label,
    }
  })
}

export const ROLE_LABELS: Readonly<Record<string, string>> = {
  recto: 'Recto — the whole front',
  verso: 'Verso — the whole back',
  detail: 'Detail',
  raking: 'Raking light',
  transmitted: 'Transmitted light',
  framed: 'Framed or matted',
  'in-room': 'In a room',
  scale: 'To scale',
  flat: 'Flat (a product)',
  lifestyle: 'In use (a product)',
  packaging: 'Gift wrap and parcel',
  showroom: 'In the showroom',
  editorial: 'Editorial — a story, a banner, a portrait',
  reference: 'Reference frame — grey board or colour card, never published',
}

export const PROVENANCE_LABELS: Readonly<Record<string, string>> = {
  photograph: 'Photograph of the real thing',
  composite: 'Composite — a photograph with something placed in it',
  rendered: 'Rendered or drawn',
  'ai-generated': 'AI-generated',
}

export const TIER_LABELS: Readonly<Record<string, string>> = {
  good: 'Good — a phone and a window',
  better: 'Better — a camera, lamps, a colour card',
  best: 'Best — a copy stand and a colour chart',
}

export const VERDICT_LABELS: Readonly<Record<string, string>> = {
  pass: 'Pass',
  'fix-owner': 'Re-take needed — design work only, never published under its role',
  legacy: 'Legacy — assessed, not held to the spec',
}

export const RETOUCHING_LABELS: Readonly<Record<string, string>> = {
  none: 'None',
  unknown: 'Unknown (a legacy image)',
  'retouched-legacy': 'Retouched before us — on the re-shoot list',
}

export const ROLE_OPTIONS = optionsOf(MEDIA_ROLES, ROLE_LABELS)
export const PROVENANCE_OPTIONS = optionsOf(MEDIA_PROVENANCES, PROVENANCE_LABELS)
export const TIER_OPTIONS = optionsOf(CAPTURE_TIERS, TIER_LABELS)
export const VERDICT_OPTIONS = optionsOf(INTAKE_VERDICTS, VERDICT_LABELS)
export const RETOUCHING_OPTIONS = optionsOf(RETOUCHING_STATES, RETOUCHING_LABELS)
