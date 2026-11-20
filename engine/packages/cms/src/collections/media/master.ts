/**
 * A `media` record's master — the gallery's capture it was processed from (CONTENT-MODEL.md §6;
 * TASKS.md 8.3.a): the intake field this CMS adds to the shared media fields
 * (`@engine/cms-core/collections/media` `intakeFields`), and the rule that holds an image to it.
 * Masters are the gallery's (`../masters`); a CMS without them adds neither.
 */
import { STAFF_ONLY_ACCESS } from '@engine/cms-core/access'
import { pickLanguage } from '@engine/cms-core/i18n'
import { ValidationError, type CollectionBeforeValidateHook, type Field } from 'payload'

const SLUG = 'media'
type Data = Record<string, unknown>

/** The capture this image was processed from — staff only, like every master's field. */
export const masterField: Field = {
  name: 'master',
  type: 'relationship',
  relationTo: 'masters',
  label: { en: 'Master', id: 'Master' },
  access: STAFF_ONLY_ACCESS,
  admin: {
    position: 'sidebar',
    description: {
      en: 'The capture this image was processed from.',
      id: 'Tangkapan tempat gambar ini diolah.',
    },
  },
}

type MasterFacts = { kind?: unknown; role?: unknown; provenance?: unknown }

/**
 * An image's role and provenance are its master's, set once at intake (CONTENT-MODEL.md §6):
 * linked to a capture, a media record may not say it is something else, or made another way.
 * The master is read with `overrideAccess` — the field is staff-only, the check is not.
 */
export const matchItsMaster: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const merged = { ...(originalDoc as Data | undefined), ...(data as Data | undefined) }
  const ref = merged.master
  const id = typeof ref === 'object' && ref !== null ? (ref as { id?: unknown }).id : ref
  if (id === null || id === undefined || id === '') return data
  const master = (await req.payload
    .findByID({ collection: 'masters', id: id as number, depth: 0, overrideAccess: true, req })
    .catch(() => null)) as MasterFacts | null
  const errors: Array<{ path: string; message: string }> = []
  if (!master) {
    errors.push({
      path: 'master',
      message: pickLanguage(req, {
        en: 'That master does not exist.',
        id: 'Master tersebut tidak ada.',
      }),
    })
  } else {
    if (master.kind !== 'capture') {
      errors.push({
        path: 'master',
        message: pickLanguage(req, {
          en: 'An image is processed from a capture, not a print file.',
          id: 'Gambar diproses dari sebuah capture, bukan berkas cetak.',
        }),
      })
    }
    for (const field of ['role', 'provenance'] as const) {
      if (master[field] && merged[field] !== master[field]) {
        errors.push({
          path: field,
          message: pickLanguage(req, {
            en: `Its master says ${field} "${String(master[field])}": an image's ${field} is its master's.`,
            id: `Master-nya menyatakan ${field} "${String(master[field])}": ${field} gambar mengikuti masternya.`,
          }),
        })
      }
    }
  }
  if (errors.length > 0) throw new ValidationError({ collection: SLUG, errors })
  return data
}
