/**
 * `POST /api/stock-levels/import` (TASKS.md 10.8.a, 27.4.c; DATA.md §3): the admin's import screen's
 * server side (`../../admin/stock-import`). Owner only. A multipart body with `file` (a `.csv` or
 * an Excel `.xlsx`), `kind` (`stock`, the default, `products` or `stores`) and `mode` (`preview`
 * or `apply`) goes to the 3.7 importer unchanged — `runImportFile(kind, …)` — so its limits (10 MB,
 * 20,000 rows, UTF-8 only, the template header), its row validation, its upserts by SKU or store
 * code and its one-transaction-per-file atomicity are the importer's own. `preview` is the
 * importer's dry run (the report is real, nothing is written); `apply` writes. A products file
 * lands as drafts and never publishes: the admin's run is not DATA.md's publish-these-records.
 *
 * The upload is checked before it is read (SECURITY.md §2.6 F2: a size limit): the declared
 * request length, the file's size, its `.csv` or `.xlsx` name and a matching media type. The
 * importer then refuses anything that is not UTF-8 text or a workbook it can open (`../../import/
 * xlsx`: the first sheet, values only, no macros), with the header spelled as the template; the
 * file is kept nowhere. A collection endpoint, not an `/api/x/` route (as `../leads/create-partner.ts`).
 */
import { hasRole } from '@engine/cms-core/access'
import type { Endpoint, PayloadHandler } from 'payload'

import { ImportError, MAX_BYTES } from '@engine/cms-core/import/csv'
import { runShopImportFile } from '../../import'
import type { ImportReport, ReportRow } from '@engine/cms-core/import/types'

/** The request may carry the file plus its multipart framing and the `kind` and `mode` fields. */
const FRAMING_BYTES = 64 * 1024
/** Rows listed to the screen; the counts always cover the whole file. */
export const MAX_REPORT_ROWS = 500

/** What the admin imports (DATA.md §3): stock, products and stores — the owner's three sheets. */
export const ADMIN_IMPORT_KINDS = ['stock', 'products', 'stores'] as const
export type AdminImportKind = (typeof ADMIN_IMPORT_KINDS)[number]

const CSV_TYPES = new Set([
  '',
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
])
const XLSX_TYPES = new Set([
  '',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'application/zip',
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
  const type = file.type.toLowerCase()
  const csv = /\.csv$/i.test(file.name) && CSV_TYPES.has(type)
  const xlsx = /\.xlsx$/i.test(file.name) && XLSX_TYPES.has(type)
  if (!csv && !xlsx) {
    return { code: 'errorNotSheet', fixCode: 'errorNotSheetFix', status: 415 }
  }
  return null
}

const RANK: Record<ReportRow['outcome'], number> = {
  rejected: 0,
  held: 1,
  new: 2,
  updated: 2,
  unchanged: 3,
}

/**
 * The report as the screen shows it: every count, then the rows that were refused — **first**,
 * with their reason (TASKS.md 27.4.c) — and the rows that change, each group in the sheet's order.
 * A long list keeps the refused rows: they are what the owner must fix.
 */
export function screenReport(report: ImportReport) {
  const listed = report.rows
    .filter((row) => row.outcome !== 'unchanged')
    .sort((a, b) => RANK[a.outcome] - RANK[b.outcome] || a.row - b.row)
  return {
    ...report,
    rows: listed.slice(0, MAX_REPORT_ROWS),
    truncated: listed.length > MAX_REPORT_ROWS,
  }
}

const refuse = (code: string, status: number, fixCode?: string) =>
  Response.json({ code, ...(fixCode ? { fixCode } : {}) }, { status })

const kindOf = (value: File | string | null): AdminImportKind | null => {
  if (value === null || value === '') return 'stock'
  return (ADMIN_IMPORT_KINDS as readonly unknown[]).includes(value)
    ? (value as AdminImportKind)
    : null
}

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
  const kind = kindOf(form.get('kind'))
  if (
    typeof file === 'string' ||
    file === null ||
    kind === null ||
    (mode !== 'preview' && mode !== 'apply')
  ) {
    return refuse('errorNoUpload', 400)
  }
  const refusal = refuseUpload(file)
  if (refusal) return refuse(refusal.code, refusal.status, refusal.fixCode)

  try {
    const report = await runShopImportFile(
      kind,
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
    req.payload.logger.error({ err: error, msg: `${kind} import failed` })
    return refuse('errorFailed', 500)
  }
}

export const stockImportEndpoint: Endpoint = {
  path: '/import',
  method: 'post',
  handler,
}
