/**
 * @contract C1 — brand config: reading a URL · owner: ARC · internal to `@engine/config/schema`
 *
 * The WHATWG URL parser, for the schema's URL rules (`./primitives`). `URL` is a global of every
 * runtime the engine runs in — Node and the browsers alike — but a type only in Node's
 * declarations or the DOM's, and a package that type-checks C1's schema has neither: lib ES2023
 * alone (`@engine/domain`, `@engine/ui` …). So the schema reaches it through `globalThis`, typed
 * with only the parts it reads, and C1 never depends on Node's types or the DOM's (3.4, CI:
 * `URL.parse` here failed every such package on Linux, while a stray `@types/node` above the
 * repository hid it on Windows). Pure.
 */

/** The parts of a parsed URL the schema reads, as the WHATWG parser normalises them. */
export type ParsedUrl = {
  readonly origin: string
  readonly protocol: string
  readonly hostname: string
  readonly username: string
  readonly password: string
}

const WhatwgUrl = (globalThis as unknown as { readonly URL: new (input: string) => ParsedUrl }).URL

/** The URL's parts, or `null` where the parser refuses it — what `URL.parse()` answers. */
export function parseUrl(input: string): ParsedUrl | null {
  try {
    return new WhatwgUrl(input)
  } catch {
    return null
  }
}
