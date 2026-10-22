/**
 * The work publish guard (TASKS.md 8.2.c; CONTENT-MODEL.md §9; requirement 3.3). Saving stays
 * cheap — a cataloguer working through a drawer of prints types what they have — and publishing is
 * when a claim becomes public, so publishing demands, **every missing requirement listed at once,
 * in plain words**:
 *
 * - a title (in the default locale), an object type and a date — of any precision, `unknown`
 *   included, but stated;
 * - a primary place, or a maker;
 * - a primary image — the first photographed recto, never a synthetic image, a detail or a
 *   photograph of its own (C9 `primaryImageIndex()`) — with alt text; no image whose capture waits
 *   on a re-take; no AI-drafted description unchecked (`./work-images`);
 * - a condition grade;
 * - no field an AI drafted that a person has not checked (`cataloguing.aiDraft`).
 *
 * **A blank location or export status never blocks publishing** (requirement 16.8, COMMERCE.md
 * §2): it makes the item enquiry-only, so its page stays live — this guard does not read
 * `physical` at all. Pure: the hook gathers the facts (`hooks/work-guard`).
 */
import { AI_DRAFTABLE_LABELS, type AiDraftableField } from '../collections/works/vocabulary'
import { hasStatedDate } from './work-dates'
import { imagePublishProblems, type ImageFacts, type Issue } from './work-images'

export type PublishFacts = {
  /** The title in the default locale. */
  readonly title: string | null
  readonly objectType: string | null
  readonly date: { readonly precision?: string | null } | null
  readonly hasMaker: boolean
  readonly hasPlaces: boolean
  readonly hasPrimaryPlace: boolean
  /** The image rows, in order, as their media records say. */
  readonly images: readonly ImageFacts[]
  readonly hasGrade: boolean
  readonly aiDraft: readonly string[]
}

/**
 * One unmet requirement: the field it is about (a Payload path), what to do — in plain words,
 * English and Indonesian, the admin speaks both (G15) — and the same in a few comma-free words
 * for the admin's error toast (`./work-images` `Issue`).
 */
export type PublishProblem = Issue & { readonly path: string }

/** "A and B", "A, B and C" for a message; "A · B · C" for a summary, which holds no comma. */
const listed = (names: readonly string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

export function publishProblems(facts: PublishFacts): PublishProblem[] {
  const problems: PublishProblem[] = []
  if (!facts.title?.trim()) {
    problems.push({
      path: 'title',
      message: 'Give the work a title in English. Berikan judul karya ini dalam bahasa Inggris.',
      summary: 'Title — give the work a title in English',
    })
  }
  if (!facts.objectType) {
    problems.push({
      path: 'objectType',
      message:
        'Say what kind of object it is: a map, a print, a photograph … Sebutkan jenis benda ini: peta, cetakan, foto …',
      summary: 'Object type — say what kind of object it is',
    })
  }
  if (!hasStatedDate(facts.date)) {
    problems.push({
      path: 'date.precision',
      message:
        'Give the date, with how certain it is — or set it to unknown, if it is. Cantumkan tanggalnya beserta tingkat kepastiannya — atau tandai sebagai tidak diketahui, memang begitu.',
      summary: 'Date — give it with how certain it is (or set it to unknown)',
    })
  }
  if (!facts.hasPrimaryPlace && !facts.hasMaker) {
    problems.push({
      path: facts.hasPlaces ? 'places' : 'makers',
      message: facts.hasPlaces
        ? 'Mark one of the places as the primary place, or credit a maker. Tandai salah satu tempat sebagai tempat utama, atau catat pembuatnya.'
        : 'Credit a maker, or add the place the work shows and mark it primary. Catat pembuatnya, atau tambahkan tempat yang digambarkan dan tandai sebagai tempat utama.',
      summary: facts.hasPlaces
        ? 'Places — mark one as primary or credit a maker'
        : 'Makers — credit a maker or add the primary place',
    })
  }
  for (const { row, ...issue } of imagePublishProblems(facts.images)) {
    problems.push({ path: row === null ? 'images' : `images.${row}.media`, ...issue })
  }
  if (!facts.hasGrade) {
    problems.push({
      path: 'condition.grade',
      message:
        'Grade the condition: an original is published with its grade. Tentukan kondisinya: barang asli terbit bersama penilaian kondisinya.',
      summary: 'Condition — grade it from the gallery’s scale',
    })
  }
  if (facts.aiDraft.length > 0) {
    const label = (field: string, language: 'en' | 'id') =>
      AI_DRAFTABLE_LABELS[field as AiDraftableField]?.[language] ?? field
    const names = facts.aiDraft.map((field) => label(field, 'en'))
    const nama = facts.aiDraft.map((field) => label(field, 'id'))
    const dan = (words: readonly string[]) =>
      words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} dan ${words.at(-1)}`
    problems.push({
      path: 'cataloguing.aiDraft',
      message: `An AI drafted ${listed(names)}, and nobody has checked ${names.length === 1 ? 'it' : 'them'} yet: check each against the object, then tick its Verified box. AI membuat draf ${dan(nama)} dan belum ada yang memeriksanya: cocokkan masing-masing dengan objeknya, lalu centang kotak Diverifikasi.`,
      summary: `Cataloguing — an AI drafted ${names.join(' · ')} and nobody has checked ${names.length === 1 ? 'it' : 'them'} yet`,
    })
  }
  return problems
}
