/**
 * One brand config, checked whole: the C1 schema first, then every rule C1's header gives
 * `validateBrandConfigs()` — the ones no schema can check alone because they need the app or
 * the whole config. The loader runs it at boot and CI runs it over every committed file
 * (`./committed.ts`), so a config that loads is a config CI passed.
 */
import { brandConfigSchema, type AppSupports, type BrandConfig, type Storefront } from '../schema'
import { collectIssues, type ConfigIssue } from './issues'
import { checkCommerce } from './rules/commerce'
import { checkModules } from './rules/modules'
import { checkMoney } from './rules/money'
import { checkRoutes } from './rules/routes'

export type ValidateOptions = {
  /**
   * What the chosen app can render (its `supports` file, TASKS.md 4.1.c). Omitted, the
   * modules ⊆ supports rule is skipped — CI always passes it; a process passes its own.
   */
  readonly supports?: AppSupports | undefined
  /** What the file's place says it must be: its folder's slug, its file name's storefront. */
  readonly expect?: { readonly slug?: string; readonly storefront?: Storefront | null }
}

export type ValidationResult =
  | { readonly ok: true; readonly config: BrandConfig; readonly issues: readonly [] }
  | {
      readonly ok: false
      readonly config: BrandConfig | null
      readonly issues: readonly ConfigIssue[]
    }

export function validateBrandConfig(
  input: unknown,
  options: ValidateOptions = {},
): ValidationResult {
  const parsed = brandConfigSchema.safeParse(input)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.filter((part) => typeof part !== 'symbol'),
      message: issue.message,
    }))
    return { ok: false, config: null, issues }
  }
  const config = parsed.data
  const { issues, report } = collectIssues()
  const { slug, storefront } = options.expect ?? {}
  if (slug !== undefined && config.slug !== slug) {
    report(['slug'], `is "${config.slug}", but the file sits in the "${slug}" brand folder`)
  }
  if (storefront && config.storefront !== storefront) {
    report(
      ['storefront'],
      `is "${config.storefront}", but the file is the brand's ${storefront} config`,
    )
  }
  checkModules(config, report, options.supports)
  checkRoutes(config, report)
  checkMoney(config, report)
  checkCommerce(config, report)
  return issues.length === 0 ? { ok: true, config, issues: [] } : { ok: false, config, issues }
}
