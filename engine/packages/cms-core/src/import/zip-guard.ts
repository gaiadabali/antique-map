/**
 * The workbook's envelope, checked before the parser opens it (DATA.md §3 "The file"; SECURITY.md
 * §2.6 F2). An `.xlsx` is a ZIP of XML parts; this reads the ZIP's own table of contents (the
 * central directory) and refuses, with a plain reason, what the import never reads:
 *
 * - **macros** (`vbaProject.bin`, an `.xlsm` renamed) and **links to other workbooks**
 *   (`externalLinks/`) — DATA.md: "macros and links to other workbooks are refused";
 * - **a ZIP bomb**: every XML part is inflated here with Node's own zlib under a hard output cap
 *   (`maxOutputLength`), so a 10 MB upload can never expand past `MAX_XML_BYTES` in the parser;
 * - **an envelope that lies**: a part whose local header disagrees with the directory, an encrypted
 *   or ZIP64 part, or more parts than any workbook carries.
 *
 * Pure (bytes in, a list of part names or an `ImportError` out); the parser runs only after it.
 */
import { inflateRawSync } from 'node:zlib'

import { ImportError } from './csv'

/** What the XML parts of an accepted workbook may inflate to, together. */
export const MAX_XML_BYTES = 100 * 1024 * 1024
/** More parts than this is not a spreadsheet a person saved. */
const MAX_ENTRIES = 2_000

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50

type Entry = {
  readonly name: string
  readonly method: number
  readonly flags: number
  readonly compressed: number
  readonly size: number
  readonly offset: number
}

const fix = 'Open it in Excel or Sheets and save it again as an Excel workbook (.xlsx).'

const broken = (name: string, why: string) =>
  new ImportError(`${name} is not a workbook the import can read: ${why}.`, fix)

/** The end-of-central-directory record: within the last 64 KB + 22 bytes of the file. */
function endRecord(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - 0xffff - 22)
  for (let at = view.byteLength - 22; at >= lowest; at -= 1) {
    if (view.getUint32(at, true) === EOCD_SIGNATURE) return at
  }
  return -1
}

/** The directory's entries, as the directory states them. */
function entriesOf(name: string, bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = view.byteLength >= 22 ? endRecord(view) : -1
  if (end < 0) throw broken(name, 'it is not a ZIP archive')
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  if (count === 0xffff || at === 0xffffffff) throw broken(name, 'it is a ZIP64 archive')
  if (count > MAX_ENTRIES) throw broken(name, `it holds ${count} parts`)
  const entries: Entry[] = []
  const decoder = new TextDecoder()
  for (let i = 0; i < count; i += 1) {
    if (at + 46 > view.byteLength || view.getUint32(at, true) !== CENTRAL_SIGNATURE) {
      throw broken(name, 'its table of contents is damaged')
    }
    const nameLength = view.getUint16(at + 28, true)
    const extra = view.getUint16(at + 30, true)
    const comment = view.getUint16(at + 32, true)
    entries.push({
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      compressed: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      offset: view.getUint32(at + 42, true),
      name: decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)),
    })
    at += 46 + nameLength + extra + comment
  }
  return entries
}

/** The part's stored bytes, after checking its local header agrees with the directory. */
function storedBytes(name: string, bytes: Uint8Array, entry: Entry): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const at = entry.offset
  if (at + 30 > view.byteLength || view.getUint32(at, true) !== LOCAL_SIGNATURE) {
    throw broken(name, `the part ${entry.name} is not where the archive says`)
  }
  const usesDescriptor = (entry.flags & 0x08) !== 0
  const localCompressed = view.getUint32(at + 18, true)
  if (view.getUint16(at + 8, true) !== entry.method) {
    throw broken(name, `the part ${entry.name} disagrees with the table of contents`)
  }
  if (!usesDescriptor && localCompressed !== entry.compressed) {
    throw broken(name, `the part ${entry.name} disagrees with the table of contents`)
  }
  const start = at + 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true)
  if (start + entry.compressed > bytes.byteLength) {
    throw broken(name, `the part ${entry.name} runs past the end of the file`)
  }
  return bytes.subarray(start, start + entry.compressed)
}

/**
 * Checks the workbook's envelope and inflates each XML part under the cap; answers the part names.
 * Throws `ImportError` with the reason and its fix.
 */
export function checkWorkbookEnvelope(name: string, bytes: Uint8Array): string[] {
  const entries = entriesOf(name, bytes)
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (lower.endsWith('vbaproject.bin')) {
      throw new ImportError(
        `${name} carries macros, which the import never opens.`,
        'Save the sheet as an Excel workbook without macros (.xlsx), or as CSV UTF-8.',
      )
    }
    if (lower.includes('externallinks/')) {
      throw new ImportError(
        `${name} links to other workbooks, which the import never follows.`,
        'Copy the values into this workbook (Paste special → Values) and save it again.',
      )
    }
  }
  let budget = MAX_XML_BYTES
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (!lower.endsWith('.xml') && !lower.endsWith('.rels')) continue
    if ((entry.flags & 0x01) !== 0) throw broken(name, 'it is encrypted')
    if (entry.method !== 0 && entry.method !== 8) {
      throw broken(name, `the part ${entry.name} uses an unknown compression`)
    }
    const stored = storedBytes(name, bytes, entry)
    let inflated: number
    try {
      inflated =
        entry.method === 0
          ? stored.byteLength
          : inflateRawSync(stored, { maxOutputLength: budget + 1 }).byteLength
    } catch {
      // Over the cap (RangeError) or a damaged stream: either way the parser never sees it.
      throw new ImportError(
        `${name} unpacks to more than ${MAX_XML_BYTES / (1024 * 1024)} MB, or is damaged.`,
        'Save it as several smaller files, or as CSV UTF-8.',
      )
    }
    budget -= inflated
    if (budget < 0) {
      throw new ImportError(
        `${name} unpacks to more than ${MAX_XML_BYTES / (1024 * 1024)} MB.`,
        'Save it as several smaller files, or as CSV UTF-8.',
      )
    }
  }
  return entries.map((entry) => entry.name)
}
