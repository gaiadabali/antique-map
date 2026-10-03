/**
 * The import CLI (DATA.md §3): one file, one kind, one run.
 *
 *   pnpm --filter @engine/cms import --file <path> --kind <antiques|products|stores|stock|discounts> [--dry-run] [--publish]
 *
 * `--dry-run` applies the file in a transaction it then rolls back: the report is the real one,
 * nothing is written. `--publish` is DATA.md's publish-these-records, which runs the publish
 * checks. The report prints to stdout; the process exits non-zero when the file was refused
 * before any row was read (the header wrong, the file not UTF-8) so a pipeline notices.
 */
import { runImportFile } from './apply'
import { ImportError, parseCsv } from './csv'
import { template } from './kinds'
import { render } from './report'
import { cms } from '../instance'

const USAGE =
  'Usage: pnpm --filter @engine/cms import --file <path> --kind <antiques|products|stores|stock|discounts> [--dry-run] [--publish]'

type Args = { file: string; kind: string; dryRun: boolean; publish: boolean }

function args(argv: readonly string[]): Args {
  const out = { file: '', kind: '', dryRun: false, publish: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--publish') out.publish = true
    else if (arg === '--file') out.file = argv[++i] ?? ''
    else if (arg === '--kind') out.kind = argv[++i] ?? ''
    else throw new ImportError(`I do not know the option '${arg}'.`, USAGE)
  }
  if (out.file === '') throw new ImportError('Name the file to import.', USAGE)
  if (out.kind === '') {
    throw new ImportError('Name the kind: antiques, products, stores, stock or discounts.', USAGE)
  }
  return out
}

async function main(): Promise<number> {
  const parsed = args(process.argv.slice(2))
  const { readFileSync } = await import('node:fs')
  const name = parsed.file.split(/[\\/]/).pop() ?? parsed.file
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(readFileSync(parsed.file))
  } catch {
    throw new ImportError(`Could not read ${parsed.file}.`, 'Check the path.')
  }
  // The header is checked before the database is touched (DATA.md: refuse the file whole).
  parseCsv(name, bytes, parsed.kind as never, template(parsed.kind as never))

  // cms() is the process's one instance (instance.ts); the CLI connects to the dev database.
  const payload = await cms()
  const report = await runImportFile(parsed.kind as never, name, bytes, {
    payload,
    runner: 'cli',
    dryRun: parsed.dryRun,
    publish: parsed.publish,
  })
  console.log(render(report))
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof ImportError) {
      console.error(`${error.message}${error.fix ? `\n${error.fix}` : ''}`)
    } else {
      console.error(error)
    }
    process.exit(1)
  })
