/**
 * Pure robots.txt builder. Staging fails closed; production lists a sitemap and selective disallows.
 *
 * `buildRobots` takes the canonical origin as a parameter, so it never reads a request header.
 */
import { excludedPrefixes } from './sitemap'

export type RobotsOptions = {
  readonly allowIndexing: boolean
}

export function buildRobots(origin: string, { allowIndexing }: RobotsOptions): string {
  const lines: string[] = []
  lines.push('User-agent: *')

  if (!allowIndexing) {
    lines.push('Disallow: /')
  } else {
    for (const prefix of excludedPrefixes) {
      lines.push(`Disallow: ${prefix}`)
    }
  }

  lines.push(`Sitemap: ${origin}/sitemap.xml`)
  return lines.join('\n') + '\n'
}
