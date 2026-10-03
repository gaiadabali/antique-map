// The no-tracker check (TASKS.md 9.2.c, ANALYTICS.md, DR-13): the built site is scanned —
// `engine/apps/web/.next/`, its HTML and its JS — for third-party trackers, and exits 1 listing
// every hit. First-party only means no GA4, no Tag Manager, no Meta Pixel, no advertising tag,
// for anyone, consent or not; the checkout page's map is the one third-party script allowed, and
// it is checked by hand, not here. A hit is a string a tracker's script or a tracking pixel
// leaves in shipped HTML or JS: its domain, an endpoint path, or an inline stub's marker.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** The tracker signatures: a lower-cased substring of the shipped text, and who it names. */
export const TRACKERS = [
  { fragment: 'googletagmanager.com', name: 'Google Tag Manager' },
  { fragment: 'google-analytics.com', name: 'Google Analytics' },
  { fragment: 'gtag(', name: 'Google Analytics (gtag stub)' },
  { fragment: 'googlesyndication.com', name: 'Google AdSense' },
  { fragment: 'doubleclick.net', name: 'DoubleClick' },
  { fragment: 'connect.facebook.net', name: 'Meta Pixel' },
  { fragment: 'facebook.com/tr', name: 'Meta Pixel' },
  { fragment: 'hotjar', name: 'Hotjar' },
  { fragment: 'clarity.ms', name: 'Microsoft Clarity' },
  { fragment: 'segment.com', name: 'Segment' },
  { fragment: 'segment.io', name: 'Segment' },
  { fragment: 'mixpanel.com', name: 'Mixpanel' },
  { fragment: 'amplitude.com', name: 'Amplitude' },
  { fragment: 'matomo', name: 'Matomo (third-party host)' },
  { fragment: 'plausible.io', name: 'Plausible (third-party host)' },
  { fragment: 'cdn.mouseflow.com', name: 'Mouseflow' },
  { fragment: 'static.hotjar.com', name: 'Hotjar' },
  { fragment: 'snap.licdn.com', name: 'LinkedIn Insight' },
  { fragment: 'analytics.tiktok.com', name: 'TikTok Pixel' },
]

export const DEFAULT_ROOT = 'engine/apps/web/.next'
const SCANNED = ['.html', '.js', '.mjs', '.css', '.txt']

function walk(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && SCANNED.some((ext) => entry.name.endsWith(ext)))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
}

/**
 * Scans a built output directory and returns every tracker hit as
 * `{ path, name, fragment }` with `path` relative to `root` (POSIX separators). A root that does
 * not exist is not a pass — the CLI answers `null` and the caller decides what that means.
 */
export function findTrackers(root) {
  let stat
  try {
    stat = statSync(root)
  } catch {
    return null
  }
  if (!stat.isDirectory()) return null
  const hits = []
  for (const absPath of walk(root)) {
    let text
    try {
      text = readFileSync(absPath, 'utf8')
    } catch {
      continue // a file that vanished mid-scan cannot hold a tracker
    }
    const lowered = text.toLowerCase()
    for (const { fragment, name } of TRACKERS) {
      if (lowered.includes(fragment)) {
        hits.push({ path: relative(root, absPath).split(sep).join('/'), name, fragment })
      }
    }
  }
  return hits
}
