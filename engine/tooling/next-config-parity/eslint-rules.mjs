// TASKS.md 5.4.b–c — the Cache Components guarantees ESLint holds (CONVENTIONS.md §12), beside
// the next.config parity test that holds the rest: one route segment config, and no storefront
// link or form that prefetches. ESLint rules only: `eslint.config.mjs` names the files each covers.
import { fence, problem, report } from '../route-parity/eslint-fences.mjs'
import { isReflectGet, memberName, staticString } from '../route-parity/static-string.mjs'

const WHY = 'CONVENTIONS.md §12'

/** Every route segment config Next reads from a layout, page or route file. */
export const SEGMENT_CONFIG = new Set([
  ...['dynamic', 'revalidate', 'fetchCache', 'runtime', 'preferredRegion', 'maxDuration'],
  ...['prefetch', 'instant', 'dynamicParams', 'generateStaticParams'],
])

/** Every name a binding pattern binds: `{ dynamic }`, `[runtime]`, `{ a: { revalidate } }` … */
function boundNames(pattern) {
  if (!pattern) return []
  if (pattern.type === 'Identifier') return [pattern.name]
  if (pattern.type === 'AssignmentPattern') return boundNames(pattern.left)
  if (pattern.type === 'RestElement') return boundNames(pattern.argument)
  if (pattern.type === 'ArrayPattern') return pattern.elements.flatMap(boundNames)
  if (pattern.type === 'ObjectPattern')
    return pattern.properties.flatMap((each) => boundNames(each.value ?? each))
  return []
}

/**
 * No file exports route segment config — but, with `{ layout: true }` (the locale layout alone),
 * `export const instant = false` as that literal and `generateStaticParams`. A destructured
 * export (`export const { dynamic } = config`) is never allowed (qa's 5.4 gate, S3).
 */
const segmentConfig = {
  meta: problem(
    `'{{name}}' is route segment config: the one allowed is \`export const instant = false\`, with \`generateStaticParams\`, on (site)/[locale]/layout.tsx (${WHY}).`,
    [{ type: 'object', properties: { layout: { type: 'boolean' } }, additionalProperties: false }],
  ),
  create(context) {
    const layout = context.options[0]?.layout === true
    const check = (node, name, allowed) =>
      SEGMENT_CONFIG.has(name) && !(layout && allowed) && report(context, node, { name })
    const instantFalse = (node) =>
      node.id.name === 'instant' && node.parent.kind === 'const' && node.init?.value === false
    return {
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator': (node) => {
        if (node.id.type === 'Identifier') return check(node, node.id.name, instantFalse(node))
        for (const name of boundNames(node.id)) check(node, name, false)
      },
      'ExportNamedDeclaration > FunctionDeclaration': (node) =>
        check(node, node.id?.name, node.id?.name === 'generateStaticParams'),
      ExportSpecifier: (node) => {
        const name = node.exported.name ?? node.exported.value
        check(node, name, name === 'generateStaticParams')
      },
    }
  },
}

/**
 * Any member read as `prefetch`, called or not, and any `prefetch` key a destructuring pattern
 * reads — so an aliased or namespaced `useRouter`, a router destructured from a variable and a
 * method pulled off without a call are all caught (qa's 5.4 gate, S3), as is a `Reflect.get` of
 * it. The name is `staticString`'s (qa's third gate, L3): `` r[`prefetch`] ``, `r[k]` for a
 * `const k = 'prefetch' as const` or an alias of one, `Reflect['get'](r, k)`, a destructured
 * `get`. A JSX `prefetch={false}` attribute and an object literal's `prefetch:` key are not members.
 */
const routerPrefetch = {
  meta: problem(
    `No storefront code prefetches: under htmlLimitedBots a prefetch is a full render (${WHY}).`,
  ),
  create: (context) => {
    const isPrefetch = (node) => staticString(node, context) === 'prefetch'
    const found = (node) => report(context, node)
    return {
      MemberExpression: (node) => memberName(node, context) === 'prefetch' && found(node),
      CallExpression: (node) =>
        isReflectGet(node.callee, context) && isPrefetch(node.arguments[1]) && found(node),
      'ObjectPattern > Property': (node) =>
        (node.computed ? isPrefetch(node.key) : (node.key.name ?? node.key.value) === 'prefetch') &&
        found(node),
    }
  },
}

/** `next/<name>`, `next/<name>.js`, and its `next/dist/(esm/)client/(app-dir/)` copies. */
const nextModule = (name) =>
  new RegExp(`^next/(?:dist/(?:esm/)?client/(?:app-dir/)?)?${name}(?:\\.js)?$`)
const NEXT_LINK = nextModule('link')
const NEXT_FORM = nextModule('form')

/** The rules, by name. */
export const RENDERING_RULES = {
  'segment-config': segmentConfig,
  'no-router-prefetch': routerPrefetch,
  'no-next-link': fence({
    banned: (target) => NEXT_LINK.test(target),
    why: `a storefront link is an <a> or the link primitive (engine/packages/ui/src/primitives/link.tsx, TASKS.md 11.1.c), which never prefetches (${WHY}).`,
  }),
  'no-next-form': fence({
    banned: (target) => NEXT_FORM.test(target),
    why: `next/form's <Form> prefetches its action: a storefront form is a plain <form>, which works without JavaScript (${WHY}).`,
  }),
}
