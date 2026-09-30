// TASKS.md 5.4.b–c — the Cache Components guarantees ESLint holds (CONVENTIONS.md §12), beside
// the next.config parity test that holds the rest: one route segment config, and no storefront
// link or form that prefetches. ESLint rules only: `eslint.config.mjs` names the files each covers.
import { fence, problem, report } from '../route-parity/eslint-fences.mjs'

const WHY = 'CONVENTIONS.md §12'

/** Every route segment config Next reads from a layout, page or route file. */
export const SEGMENT_CONFIG = new Set([
  ...['dynamic', 'revalidate', 'fetchCache', 'runtime', 'preferredRegion', 'maxDuration'],
  ...['prefetch', 'instant', 'dynamicParams', 'generateStaticParams'],
])

/**
 * No file exports route segment config — but, with `{ layout: true }` (the locale layout alone),
 * `export const instant = false` as that literal and `generateStaticParams`.
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
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator': (node) =>
        check(node, node.id.name, instantFalse(node)),
      'ExportNamedDeclaration > FunctionDeclaration': (node) =>
        check(node, node.id?.name, node.id?.name === 'generateStaticParams'),
      ExportSpecifier: (node) => {
        const name = node.exported.name ?? node.exported.value
        check(node, name, name === 'generateStaticParams')
      },
    }
  },
}

/** `<anything>.prefetch()` — the router's, however it is named — and `{ prefetch } = useRouter()`. */
const routerPrefetch = {
  meta: problem(
    `No storefront code prefetches: under htmlLimitedBots a prefetch is a full render (${WHY}).`,
  ),
  create: (context) => ({
    'CallExpression > MemberExpression.callee[property.name="prefetch"]': (node) =>
      report(context, node),
    'VariableDeclarator[init.callee.name="useRouter"] Property[key.name="prefetch"]': (node) =>
      report(context, node),
  }),
}

/** The rules, by name. */
export const RENDERING_RULES = {
  'segment-config': segmentConfig,
  'no-router-prefetch': routerPrefetch,
  'no-next-link': fence({
    banned: (source) => /^next\/(?:link|dist\/client\/(?:app-dir\/)?link(?:\.js)?)$/.test(source),
    why: `a storefront link is an <a> or the link primitive (engine/packages/ui/src/primitives/, TASKS.md 11.1.c), which never prefetches (${WHY}).`,
  }),
  'no-next-form': fence({
    banned: (source) => /^next\/(?:form|dist\/client\/form(?:\.js)?)$/.test(source),
    why: `next/form's <Form> prefetches its action: a storefront form is a plain <form>, which works without JavaScript (${WHY}).`,
  }),
}
