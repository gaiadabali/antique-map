// qa's 5.4 third gate, L3 and L4 — what the prefetch, link and require rules read through: one
// `staticString(node)` for the string a node always holds, and one `holdsRequire` for a name that
// always holds a `require`. Both follow a binding to every value written to it, so a `const`
// chain, a late assignment, an alias, `as const` and `satisfies` all resolve; anything computed
// at run time is `null`/`false`, and a rule that needs it static says so.

/** `x as T`, `x satisfies T`, `<T>x`, `x!`, `(x)`: the expression the type wraps. */
const WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'ParenthesizedExpression',
  'ChainExpression',
])
const unwrap = (node) => (node && WRAPPERS.has(node.type) ? unwrap(node.expression) : node)

/**
 * The variable an identifier names, from the scope it is used in outwards; `null` for one the
 * file never declares (a global such as `require`, which the config's `globals` list without a
 * definition).
 */
export function variableOf(identifier, context) {
  for (let scope = context.sourceCode.getScope(identifier); scope; scope = scope.upper) {
    const variable = scope.set.get(identifier.name)
    if (variable) return variable.defs.length > 0 ? variable : null
  }
  return null
}

/**
 * Every value a variable is ever given: a declarator's `init` and each later assignment's right
 * side (`let late; late = createRequire(url)`); `null` when one is not a plain `=` of a value —
 * a parameter, a destructuring, a `+=`, a `for…of` binding — so nothing about it is static.
 */
function writtenValues(variable) {
  const values = []
  for (const ref of variable.references) {
    if (!ref.isWrite()) continue
    const parent = ref.identifier.parent
    const plain =
      (parent.type === 'VariableDeclarator' && parent.id === ref.identifier) ||
      (parent.type === 'AssignmentExpression' &&
        parent.operator === '=' &&
        parent.left === ref.identifier)
    if (!plain || !ref.writeExpr) return null
    values.push(ref.writeExpr)
  }
  return variable.defs.length > 0 && values.length > 0 ? values : null
}

/** The one value every write of `identifier`'s binding resolves to by `read`, else `null`. */
function bindingValue(identifier, context, read, seen) {
  const variable = variableOf(identifier, context)
  if (!variable || seen.has(variable)) return null
  seen.add(variable)
  const values = writtenValues(variable)?.map((value) => read(value, seen))
  if (!values || values.some((value) => value === null)) return null
  return values.every((value) => value === values[0]) ? values[0] : null
}

/**
 * The string `node` always holds: a string literal, a template literal with no `${}`, either
 * behind `as const`, `satisfies` or parentheses, or a name whose every value is one
 * (`const k4 = k1`); `null` for anything else.
 */
export function staticString(node, context, seen = new Set()) {
  const bare = unwrap(node)
  if (!bare) return null
  if (bare.type === 'Literal') return typeof bare.value === 'string' ? bare.value : null
  if (bare.type === 'TemplateLiteral')
    return bare.expressions.length === 0 ? bare.quasis[0].value.cooked : null
  if (bare.type === 'Identifier' && context)
    return bindingValue(bare, context, (value, s) => staticString(value, context, s), seen)
  return null
}

/** The name a member reads, static or computed (`a.b`, `a['b']`, `` a[`b`] ``, `a[k]`). */
export const memberName = (node, context) =>
  node?.type !== 'MemberExpression'
    ? null
    : node.computed
      ? staticString(node.property, context)
      : node.property.name

/**
 * Whether `node` is `Reflect.get` however reached: `Reflect.get`, `Reflect['get']`, a
 * `const { get } = Reflect` (or `{ ['get']: g }`), or a name holding any of them.
 */
export function isReflectGet(node, context, seen = new Set()) {
  const bare = unwrap(node)
  if (bare?.type === 'MemberExpression')
    return unwrap(bare.object)?.name === 'Reflect' && memberName(bare, context) === 'get'
  if (bare?.type !== 'Identifier') return false
  const variable = variableOf(bare, context)
  if (!variable || seen.has(variable)) return false
  seen.add(variable)
  const def = variable.defs[0]?.node
  const property = def?.type === 'VariableDeclarator' && def.id.type === 'ObjectPattern' && def.id
  if (property)
    return (
      unwrap(def.init)?.name === 'Reflect' &&
      property.properties.some(
        (p) =>
          p.type === 'Property' &&
          unwrap(p.value)?.name === bare.name &&
          (p.computed ? staticString(p.key, context) : (p.key.name ?? p.key.value)) === 'get',
      )
    )
  const values = writtenValues(variable)
  return Boolean(values?.every((value) => isReflectGet(value, context, seen)))
}

const MODULES = new Set(['module', 'node:module'])

/** Whether `node` is `createRequire`: by name, `module.createRequire`, an aliased import, a name holding it. */
function isCreateRequireFn(node, context, seen) {
  const bare = unwrap(node)
  if (bare?.type === 'MemberExpression') return memberName(bare, context) === 'createRequire'
  if (bare?.type !== 'Identifier') return false
  if (bare.name === 'createRequire') return true
  const variable = context && variableOf(bare, context)
  const def = variable?.defs[0]
  if (def?.type === 'ImportBinding')
    return (
      def.node.type === 'ImportSpecifier' &&
      (def.node.imported.name ?? def.node.imported.value) === 'createRequire' &&
      MODULES.has(def.parent.source.value)
    )
  if (!variable || seen.has(variable)) return false
  seen.add(variable)
  const values = writtenValues(variable)
  return Boolean(values?.every((value) => isCreateRequireFn(value, context, seen)))
}

/**
 * Whether `node` is a `require` function: `require`, `module.require`, `createRequire(…)`
 * (`import { createRequire as cr }` too), or a name whose every value is one — held in a `const`,
 * assigned later, or aliased (`const again = held`).
 */
export function holdsRequire(node, context, seen = new Set()) {
  const bare = unwrap(node)
  if (bare?.type === 'CallExpression') return isCreateRequireFn(bare.callee, context, seen)
  if (bare?.type === 'MemberExpression') return memberName(bare, context) === 'require'
  if (bare?.type !== 'Identifier') return false
  if (bare.name === 'require' && !variableOf(bare, context)) return true
  const variable = variableOf(bare, context)
  if (!variable || seen.has(variable)) return false
  seen.add(variable)
  const values = writtenValues(variable)
  return Boolean(values?.every((value) => holdsRequire(value, context, seen)))
}

/**
 * The specifier node a call loads through a `require` (`holdsRequire`): `r('x')`,
 * `r.call(null, 'x')`, `r.apply(null, ['x'])`; `undefined` for any other call.
 */
export function requireArgument(call, context) {
  const callee = unwrap(call.callee)
  if (holdsRequire(callee, context)) return call.arguments[0]
  const via = memberName(callee, context)
  if ((via !== 'call' && via !== 'apply') || !holdsRequire(callee.object, context)) return undefined
  const [, second] = call.arguments
  return via === 'call' ? second : second?.type === 'ArrayExpression' ? second.elements[0] : second
}
