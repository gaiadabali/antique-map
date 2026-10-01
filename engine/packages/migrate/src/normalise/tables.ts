/**
 * The tables the normalisers read. Everything one store says its own way — the
 * wording of its condition scale, its SKU prefixes, the SEO phrases it tacked
 * onto titles, how it wrote colouring, the labels on its product pages — is
 * data in the brand's `content/legacy/` folder, passed in here (MIGRATION.md
 * §4: engine code is source-shaped, never brand-shaped). The defaults are
 * neutral: the D10 grading scale, US dollars, "On Request", and no
 * store-specific phrase at all — so with the defaults, anything store-specific
 * lands in the review file rather than being guessed.
 */

export type GradeTerm = {
  /** The term as the scale publishes it: `VG+`. */
  readonly code: string
  /** Other spellings meaning exactly this grade (`Very good`), matched case-blind. */
  readonly aliases: readonly string[]
  /** The A–D equivalent, once the curator has published it (D10); `null` until then. */
  readonly equivalent: string | null
}

export type NormaliseTables = {
  /** D10 by default: VG+ · VG · G+ · G · Fair · As-is. */
  readonly grades: readonly GradeTerm[]
  /** Stock phrases the store appended to every condition ("study the images"), dropped from notes. */
  readonly conditionBoilerplate: readonly string[]
  /** The currency a bare amount (a database decimal) is in. */
  readonly currency: string
  /**
   * Minor-unit exponents of the currencies the old store priced in — the
   * engine's own (C1 `CURRENCY_EXPONENT`), never ISO's assumed: this package
   * does not depend on `@engine/config`, so the CLI passes them in.
   */
  readonly currencyExponents: Readonly<Record<string, number>>
  /** Price text meaning "price on request". */
  readonly onRequest: readonly string[]
  /** Price text meaning "no price shown" (a sold item's dash). */
  readonly noPrice: readonly string[]
  /** Phrases the store tacked onto titles for search engines, removed from the end of a title. */
  readonly seoSuffixes: readonly string[]
  /** Words that make an untabled trailing " - …" segment look like an SEO suffix (→ review). */
  readonly seoSignalWords: readonly string[]
  /** Known stock-number prefixes (`M`, `P` …); empty accepts any one to three letters. */
  readonly stockPrefixes: readonly string[]
  /** Colour wording (compared by `key()`) → the colour select value, or `null` for "says nothing about colour". */
  readonly colours: Readonly<Record<string, string | null>>
  /** Placeholder names that mean "no maker" or "no place" (`Unknown`). */
  readonly placeholders: readonly string[]
  /** Qualifiers beside a measurement that say which rectangle it is. */
  readonly dimensionQualifiers: {
    readonly image: readonly string[]
    readonly sheet: readonly string[]
  }
  /** Labels that open an inline reference: `Ref`, `Reference` … */
  readonly referenceLabels: readonly string[]
  /** Years outside this window are sent to review (a typo like `950`). */
  readonly years: { readonly earliest: number; readonly latest: number }
  /** The public read's panel and card labels (the package README's `PublicProductRecord`). */
  readonly publicReadLabels: {
    readonly title: string
    readonly publication: string
    readonly dimensions: string
    readonly colour: string
    readonly condition: string
    readonly price: string
    readonly stockNumber: string
    readonly stockNumberPrefix: string
  }
}

export const DEFAULT_TABLES: NormaliseTables = {
  grades: ['VG+', 'VG', 'G+', 'G', 'Fair', 'As-is'].map((code) => ({
    code,
    aliases: [],
    equivalent: null,
  })),
  conditionBoilerplate: [],
  currency: 'USD',
  currencyExponents: { USD: 2 },
  onRequest: ['On Request', 'Price on Request'],
  noPrice: ['-'],
  seoSuffixes: [],
  seoSignalWords: ['rare', 'antique', 'original'],
  stockPrefixes: [],
  colours: {},
  placeholders: ['Unknown'],
  dimensionQualifiers: {
    image: ['image', 'photograph', 'photo', 'size of photograph', 'unframed'],
    sheet: ['sheet', 'full sheet', 'full sheets'],
  },
  referenceLabels: ['Ref', 'Refs', 'Reference', 'References'],
  years: { earliest: 1400, latest: 2030 },
  publicReadLabels: {
    title: 'Title',
    publication: 'Publication Place / Date',
    dimensions: 'Image Dimensions',
    colour: 'Color',
    condition: 'Condition',
    price: 'Product Price',
    stockNumber: 'Product Number',
    stockNumberPrefix: 'SKU #',
  },
}

/**
 * Reads a tables file (JSON) over the defaults: each key present replaces the
 * default; an unknown key or a wrong type is refused, naming the field.
 */
export function parseTables(
  input: unknown,
  base: NormaliseTables = DEFAULT_TABLES,
): NormaliseTables {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('normalise tables: expected a JSON object')
  }
  const out: Record<string, unknown> = { ...base }
  for (const [name, value] of Object.entries(input)) {
    if (name.startsWith('//')) continue
    if (!(name in base)) throw new Error(`normalise tables: unknown field "${name}"`)
    const expected = base[name as keyof NormaliseTables]
    if (!sameShape(expected, value))
      throw new Error(`normalise tables: "${name}" has the wrong shape`)
    out[name] = name === 'grades' ? parseGrades(value) : value
  }
  return out as NormaliseTables
}

function parseGrades(value: unknown): GradeTerm[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error('normalise tables: "grades" is empty')
  return value.map((entry: unknown, index) => {
    const term = entry as Partial<GradeTerm> | null
    if (term === null || typeof term.code !== 'string' || term.code.trim() === '') {
      throw new Error(`normalise tables: grades[${index}] needs a "code"`)
    }
    const aliases = term.aliases ?? []
    if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== 'string')) {
      throw new Error(`normalise tables: grades[${index}].aliases must be strings`)
    }
    const equivalent = term.equivalent ?? null
    if (equivalent !== null && typeof equivalent !== 'string') {
      throw new Error(`normalise tables: grades[${index}].equivalent must be a string or null`)
    }
    return { code: term.code, aliases, equivalent }
  })
}

/** Shallow structural check against the default: arrays of strings, records, numbers, strings. */
function sameShape(expected: unknown, value: unknown): boolean {
  if (Array.isArray(expected)) {
    if (!Array.isArray(value)) return false
    return expected.length === 0 || typeof expected[0] !== 'string'
      ? true
      : value.every((item) => typeof item === 'string')
  }
  if (expected !== null && typeof expected === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    const sample = Object.values(expected)[0]
    return Object.values(value).every((item) =>
      sample === undefined
        ? true
        : item === null || typeof item === typeof sample || sameShape(sample, item),
    )
  }
  return typeof value === typeof expected
}
