// qa's 5.4 re-gate, L3 — two text-identical `next.config.ts` can still resolve differently: an
// imported per-app file, or a branch on `import.meta.url`. So each app's loaded config is also
// compared, as Next would see it, against the first app's: `headers()`, `rewrites()` and
// `redirects()` evaluated, a RegExp by its source, any other function by its text.

const EVALUATED = new Set(['headers', 'rewrites', 'redirects'])

/** A plain, comparable copy of a loaded config (its default export). */
export async function resolvedConfigOf(config) {
  const plain = async (value, key) => {
    if (typeof value === 'function')
      return EVALUATED.has(key) ? { [`${key}()`]: await plain(await value()) } : `ƒ ${value}`
    if (value instanceof RegExp) return `/${value.source}/${value.flags}`
    if (Array.isArray(value)) return Promise.all(value.map((each) => plain(each)))
    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort()
      return Object.fromEntries(
        await Promise.all(keys.map(async (k) => [k, await plain(value[k], k)])),
      )
    }
    return value
  }
  return plain(config)
}

/** Every path at which `a` and `b` differ, as `key.key[0]…`. */
function differingPaths(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  const objects = a && b && typeof a === 'object' && typeof b === 'object'
  if (!objects || Array.isArray(a) !== Array.isArray(b)) return [at || '(the config)']
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
  return keys.flatMap((key) => {
    const next = Array.isArray(a) ? `${at}[${key}]` : at ? `${at}.${key}` : key
    return differingPaths(a[key], b[key], next)
  })
}

/**
 * One problem per app whose resolved config (`byApp`: `{ app: resolvedConfigOf(…) }`) differs
 * from the first app's, naming both files (`files[app]`) and the paths that differ.
 */
export function resolvedDifferences(byApp, files) {
  const [[firstApp, first], ...others] = Object.entries(byApp)
  return others.flatMap(([app, resolved]) => {
    const paths = differingPaths(first, resolved)
    return paths.length === 0
      ? []
      : [`${files[app]} resolves differently from ${files[firstApp]} at ${paths.join(', ')}`]
  })
}
