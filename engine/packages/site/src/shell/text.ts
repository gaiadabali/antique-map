/**
 * The words a shared shell part asks its site for: a site's shell text answers every
 * `ShellMessageKey` (`@engine/i18n/shell`), so either app's `t` fits.
 */
import type { ShellMessageKey } from '@engine/i18n/shell'

export type ShellT = (key: ShellMessageKey, params?: Record<string, string>) => string
