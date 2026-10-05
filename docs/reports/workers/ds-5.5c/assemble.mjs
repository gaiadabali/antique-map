// Minimal local stand-in for .github/scripts/assemble-artifact.sh: copy the build's static assets
// and public/ into the standalone app dir so `node …/server.js` serves a complete tree (the way
// the gate does locally). sharp: the traced node_modules already carries it here.
// Self-locating (repo root = four levels up from this file) so it also runs from the fresh clone.
/* global console */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const app = resolve(HERE, '../../../..', 'engine', 'apps', 'web')
const standalone = join(app, '.next', 'standalone')
const serverDir = join(standalone, 'engine', 'apps', 'web')

const staticSrc = join(app, '.next', 'static')
const staticDst = join(serverDir, '.next', 'static')
const publicSrc = join(app, 'public')
const publicDst = join(serverDir, 'public')

mkdirSync(join(serverDir, '.next'), { recursive: true })
rmSync(staticDst, { recursive: true, force: true })
cpSync(staticSrc, staticDst, { recursive: true })
if (existsSync(publicSrc)) {
  rmSync(publicDst, { recursive: true, force: true })
  cpSync(publicSrc, publicDst, { recursive: true })
}
console.log('assembled into', serverDir)
console.log('static:', existsSync(staticDst), 'public:', existsSync(publicDst))
