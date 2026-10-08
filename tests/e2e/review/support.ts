/** Shared by the 10.6.f specs: staging origins, the price sample, a polite pause, the price scanner. */
import { readFileSync } from 'node:fs'

export const GALLERY = process.env.E2E_BASE_GALLERY ?? 'https://indies-gallery.gaiada.com'
export const SHOP = process.env.E2E_BASE_SHOP ?? 'https://old-east-indies.gaiada.com'

/**
 * The price sample is owner-only data, so it never enters git (DATA.md §2): a file outside the
 * checkout, made on Helios by the query in docs/gates/review-content.md §How to re-run, named by
 * `E2E_PRICE_SAMPLE`.
 */
export const SAMPLE_CSV = process.env.E2E_PRICE_SAMPLE ?? ''

export type SampleWork = { publicId: number; price: number; status: string; tiled: number }

/** The 70 published works that carry an owner-only asking price (whole USD): `publicId,askingPrice,status,tiledImages`. */
export function readSample(): SampleWork[] {
  if (SAMPLE_CSV === '') {
    throw new Error(
      'Set E2E_PRICE_SAMPLE to the price sample CSV (outside git; see docs/gates/review-content.md).',
    )
  }
  return readFileSync(SAMPLE_CSV, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\d+,/.test(l))
    .map((l) => {
      const [publicId, price, status, tiled] = l.split(',')
      return {
        publicId: Number(publicId),
        price: Number(price),
        status: status!,
        tiled: Number(tiled),
      }
    })
}

/** Items whose lead image is IIIF-tiled (from the database, 2026-10-08). */
export const TILED = [507, 1237, 468, 692, 467] as const

export const pause = (ms = 120) => new Promise((r) => setTimeout(r, ms))

/**
 * The work's own asking-price figure as a standalone number: not part of a longer digit run, a word,
 * a path, a hash or a decimal. Matches the bare figure (`280000`) and the grouped forms
 * (`280,000`, `280.000`, `280 000`, with a no-break space). Digits, letters, `_`, `-`, `/`, `.`+digit
 * and `,`+digit on either side disqualify, so `1280000`, `a280000b`, `/280000/` and `0.280000` miss.
 */
export function figureRegex(n: number): RegExp {
  const grouped = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[,. \u00a0]?')
  return new RegExp(String.raw`(?<![\w\-/]|\d[.,]|\.)` + grouped + String.raw`(?![\w\-/]|[.,]\d)`)
}

/** A figure written next to a currency word or sign, any size (so a 2-digit price cannot hide). */
export function currencyFigureRegex(n: number): RegExp {
  const grouped = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[,. \u00a0]?')
  return new RegExp(
    // String.raw: a plain template literal would drop the backslashes of \s, \d, \$ and \b.
    String.raw`(?:USD|US\$|\$|IDR|Rp\.?|SGD|S\$|EUR|€|£)\s*${grouped}(?!\d)|(?<!\d)${grouped}\s*(?:USD|dollars?|US\$|IDR|EUR)\b`,
    'i',
  )
}

/** The JSON-LD blocks of an HTML document, parsed. */
export function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = []
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    out.push(JSON.parse(m[1]!))
  }
  return out
}

/** Visible-ish text of an HTML document: scripts, styles and tags removed. */
export function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}
