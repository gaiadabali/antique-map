// Types for `index.mjs`, so a TypeScript test (lib ES2023, no allowJs) can import the gate.
export type ImportKind = 'static' | 'dynamic'
/** `expression`: a dynamic `import()` whose argument is not a string — its source (4.7.a). */
export type ImportOf = { specifier: string; kind: ImportKind; expression?: string }
export type ChainStep = ImportOf & { file: string }
export type Reach = {
  chain: ChainStep[]
  specifier: string
  reason: string | null
  error?: string
  expression?: string
}

export declare const BROWSER_CONDITIONS: ReadonlySet<string>
export declare const RULES: ReadonlyArray<{ test: (specifier: string) => boolean; reason: string }>

export declare const UNRESOLVABLE: string

export declare function importsOf(file: string): ImportOf[]
export declare function dynamicImports(
  source: string,
): ({ specifier: string } | { expression: string })[]
export declare function specifiersOf(file: string): string[]
export declare function moduleFile(path: string): string | null
export declare function resolvePackage(specifier: string, from: string): string
export declare function follow(specifier: string, from: string): string | null
export declare function runtimeReach(entry: string, seen?: Set<string>): Set<string>
export declare function directReach(entry: string, seen?: Set<string>): Set<string>
export declare function findReaches(
  entry: string,
  forbidden: (specifier: string) => string | null,
): Reach[]
export declare function forbiddenReason(specifier: string): string | null
