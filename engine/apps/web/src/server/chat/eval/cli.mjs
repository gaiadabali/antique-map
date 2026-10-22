#!/usr/bin/env node
// `pnpm ai:eval` (ticket 8.4b): recorded mode by default (no network, no key), `--live` for a real
// run (refuses without `ANTHROPIC_API_KEY`, exit 2), `--record` to rewrite recordings from a live
// run, `--max-usd` to cap live spend (default 3). Loads the TS eval package through Vite's SSR
// module runner — the same loader Vitest itself uses — so `import 'server-only'` and the app's
// workspace packages resolve exactly as they do under the real tests.
// This file lives under `src/server`, so the repo's eslint config does not grant it Node's
// globals (that's reserved for `engine/tooling/**` and `scripts/**`) — import them explicitly.
import console from 'node:console'
import process from 'node:process'
import { createServer } from 'vite'

function listFlag(argv, name) {
  const i = argv.indexOf(name)
  const v =
    i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1)
  const list = v
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  return list?.length ? list : undefined
}

function parseArgs(argv) {
  const live = argv.includes('--live')
  const record = argv.includes('--record')
  const flag = argv.find((a) => a.startsWith('--max-usd'))
  let maxUsd
  if (flag) {
    const eq = flag.indexOf('=')
    maxUsd = Number(eq >= 0 ? flag.slice(eq + 1) : argv[argv.indexOf(flag) + 1])
  }
  return {
    live,
    record,
    maxUsd: Number.isFinite(maxUsd) ? maxUsd : undefined,
    only: listFlag(argv, '--only'),
    group: listFlag(argv, '--group'),
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'warn',
    ssr: { noExternal: ['server-only'], resolve: { conditions: ['react-server'] } },
  })
  try {
    const { runEval, writeReport } = await server.ssrLoadModule(
      '/engine/apps/web/src/server/chat/eval/run-eval.ts',
    )
    const { summaryMarkdown, passed } = await server.ssrLoadModule(
      '/engine/apps/web/src/server/chat/eval/report.ts',
    )

    const result = await runEval(options)
    if (!result.ok) {
      console.error(`ai:eval: ${result.reason}`)
      process.exitCode = 2
      return
    }

    const file = writeReport(result.report)
    console.log(summaryMarkdown(result.report))
    console.log(`Full report: ${file}`)
    process.exitCode = passed(result.report.results) ? 0 : 1
  } finally {
    await server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
