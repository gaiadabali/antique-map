/**
 * `POST /api/stock-levels/import` (TASKS.md 10.8.a; DATA.md §3): the stock import screen's server
 * side (`../../admin/stock-import`). Owner only. A multipart body with `file` (a `.csv`) and
 * `mode` (`preview` or `apply`) goes to the 3.7 importer unchanged — `runImportFile('stock', …)`
 * — so its limits (10 MB, 20,000 rows, UTF-8 only, the template header), its row validation and
 * its one-transaction-per-file atomicity are the importer's own. `preview` is the importer's dry
 * run (the report is real, nothing is written); `apply` writes.
 *
 * The upload is checked before it is read (SECURITY.md §2.6 F2: a size limit): the declared
 * request length, the file's size, its `.csv` name and a text or CSV media type. The importer
 * then refuses anything that is not UTF-8 text with the header spelled as the template; the file
 * is kept nowhere. A collection endpoint, not an `/api/x/` route (as `../leads/create-partner.ts`).
 */
import type { Endpoint, PayloadHandler } from 'payload'

import { ImportError, MAX_BYTES } from '../../import/csv'
import { runImportFile } from '../../import/apply'
import type { ImportReport } from '../../import/types'
import { hasRole } from '../users/roles'

/** The request may carry the file plus its multipart framing and the `mode` field. */
const FRAMING_BYTES = 64 * 1024
/** Rows listed to the screen; the counts always cover the whole file. */
export const MAX_REPORT_ROWS = 500

const CSV_TYPES = new Set([
  '',
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
])

export type UploadRefusal = { code: string; fixCode?: string; status: number }

/** Why this upload is refused before it is read, or `null` when it may go to the importer. */
export function refuseUpload(file: {
  name: string
  size: number
  type: string
}): UploadRefusal | null {
  if (file.size > MAX_BYTES) {
    return { code: 'errorTooBig', fixCode: 'errorTooBigFix', status: 413 }
  }
  if (!/\.csv$/i.test(file.name) || !CSV_TYPES.has(file.type.toLowerCase())) {
    return { code: 'errorNotCsv', fixCode: 'errorNotCsvFix', status: 415 }
  }
  return null
}

/** The report as the screen shows it: every count, and the rows that changed or were refused. */
export function screenReport(report: ImportReport) {
  const listed = report.rows.filter((row) => row.outcome !== 'unchanged')
  return {
    ...report,
    rows: listed.slice(0, MAX_REPORT_ROWS),
    truncated: listed.length > MAX_REPORT_ROWS,
  }
}

const refuse = (code: string, status: number, fixCode?: string) =>
  Response.json({ code, ...(fixCode ? { fixCode } : {}) }, { status })

const handler: PayloadHandler = async (req) => {
  if (!hasRole(req.user, 'owner')) return refuse('errorForbidden', 403)

  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES + FRAMING_BYTES) return refuse('errorTooBig', 413, 'errorTooBigFix')

  let form: FormData
  try {
    form = await req.formData!()
  } catch {
    return refuse('errorNoUpload', 400)
  }
  const file = form.get('file')
  const mode = form.get('mode')
  if (typeof file === 'string' || file === null || (mode !== 'preview' && mode !== 'apply')) {
    return refuse('errorNoUpload', 400)
  }
  const refusal = refuseUpload(file)
  if (refusal) return refuse(refusal.code, refusal.status, refusal.fixCode)

  try {
    const report = await runImportFile(
      'stock',
      file.name,
      new Uint8Array(await file.arrayBuffer()),
      {
        payload: req.payload,
        runner: (req.user as { email?: string } | null)?.email ?? 'owner',
        dryRun: mode === 'preview',
        user: req.user,
      },
    )
    return Response.json({ report: screenReport(report) })
  } catch (error) {
    if (error instanceof ImportError) {
      // The importer's own refusal of the whole file (header, encoding, size): plain words and a fix.
      return Response.json(
        { code: 'errorFailed', error: error.message, ...(error.fix ? { fix: error.fix } : {}) },
        { status: 422 },
      )
    }
    req.payload.logger.error({ err: error, msg: 'stock import failed' })
    return refuse('errorFailed', 500)
  }
}

export const stockImportEndpoint: Endpoint = {
  path: '/import',
  method: 'post',
  handler,
}
