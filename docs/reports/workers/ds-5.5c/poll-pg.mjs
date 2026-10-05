// Poll the dev Postgres container until it reports healthy, then print and exit.
/* global console, process, setTimeout */
import { execFileSync } from 'node:child_process'

const container = 'indies-platform-dev-postgres-1'
const deadline = Date.now() + 20 * 60 * 1000
for (;;) {
  let status = 'unknown'
  try {
    status = execFileSync(
      'docker',
      ['inspect', container, '--format', '{{.State.Health.Status}}'],
      { encoding: 'utf8' },
    ).trim()
  } catch (error) {
    status = `inspect-failed: ${error.message}`
  }
  if (status === 'healthy') {
    console.log('healthy')
    process.exit(0)
  }
  if (Date.now() > deadline) {
    console.error(`gave up waiting; last status ${status}`)
    process.exit(1)
  }
  await new Promise((done) => setTimeout(done, 15000))
}
