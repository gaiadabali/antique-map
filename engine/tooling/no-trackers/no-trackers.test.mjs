import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findTrackers, TRACKERS } from './no-trackers.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

function write(root, relPath, text) {
  const abs = join(root, relPath)
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, text)
  return abs
}

describe('no-trackers — fixture strings', () => {
  it('flags a googletagmanager script', () => {
    const html = '<script src="https://www.googletagmanager.com/gtag/js?id=G-ABC"></script>'
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'nt-')))
    write(root, 'index.html', html)
    expect(findTrackers(root)).toEqual([
      { path: 'index.html', name: 'Google Tag Manager', fragment: 'googletagmanager.com' },
    ])
  })

  it('flags a Meta Pixel and a gtag stub in JS, with the file each hit is in', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'nt-')))
    write(root, 'js/chunk.js', 'fbq("init"); fetch("https://connect.facebook.net/x")')
    write(root, 'js/other.js', 'window.dataLayer = []; gtag("config", "G-X");')
    const hits = findTrackers(root)
    expect(hits.map((hit) => hit.path).sort()).toEqual(['js/chunk.js', 'js/other.js'])
    expect(hits.map((hit) => hit.name)).toContain('Meta Pixel')
    expect(hits.map((hit) => hit.name)).toContain('Google Analytics (gtag stub)')
  })

  it('is case-insensitive: an obfuscated host still trips', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'nt-')))
    write(root, 'a.js', '"GOOGLE-ANALYTICS.COM"')
    expect(findTrackers(root)).toHaveLength(1)
  })

  it('passes a first-party build: no tracker, no hit', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'nt-')))
    write(root, 'index.html', '<script src="/_next/static/chunk.js"></script>')
    write(root, 'js/chunk.js', 'fetch("/api/x/collect", { method: "POST" })')
    expect(findTrackers(root)).toEqual([])
  })

  it('scans only what a build ships (html, js, css, txt)', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'nt-')))
    write(root, 'cache.json', 'googletagmanager.com') // not shipped to a browser
    expect(findTrackers(root)).toEqual([])
  })

  it('answers null for a root that does not exist — no build is not a pass', () => {
    expect(findTrackers(join(tmpdir(), 'nt-does-not-exist'))).toBeNull()
  })

  it('every tracker signature is distinct, so a hit names one product', () => {
    const seen = new Set()
    for (const { fragment } of TRACKERS) {
      expect(seen.has(fragment), fragment).toBe(false)
      seen.add(fragment)
    }
  })
})
