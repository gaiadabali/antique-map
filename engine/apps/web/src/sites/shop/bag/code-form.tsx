'use client'

/**
 * The welcome-code field (6.2; EXPERIENCE-SHOP.md §5): a plain form posting to the bag's server
 * action, so applying a code works without JavaScript. The server validates the code against
 * `discounts`; every failure line arrives as a server-rendered string, chosen by what it refused.
 */
import { useActionState } from 'react'

import type { CodeActionState } from '../../../server/shop/bag/actions'
import { applyCodeAction } from '../../../server/shop/bag/actions'
import styles from './bag.module.css'

export type CodeFormProps = {
  readonly label: string
  readonly applyLabel: string
  readonly appliedCode: string | null
  /** The standing problem, server-rendered; `null` while the code is fine. */
  readonly problem: string | null
  /** The words for a just-accepted code, `{code}` in the text. */
  readonly appliedMessage: string | null
  /** The words for each refusal, by the server's lexicon key (already rendered, `{amount}` in). */
  readonly problemTexts: Readonly<Record<string, string>>
  readonly unknownMessage: string
  readonly clearMessage: string
}

const INITIAL: CodeActionState | null = null

export function CodeForm({
  label,
  applyLabel,
  appliedCode,
  problem,
  appliedMessage,
  problemTexts,
  unknownMessage,
  clearMessage,
}: CodeFormProps): React.ReactElement {
  const [state, apply, pending] = useActionState(applyCodeAction, INITIAL)
  const cleared = state !== null && state.ok && state.code === undefined && appliedCode !== null
  const failed =
    state !== null && !state.ok
      ? state.problem !== undefined
        ? (problemTexts[state.problem.key] ?? unknownMessage)
        : unknownMessage
      : null
  const standing = state === null ? problem : null
  return (
    <div className={styles.code}>
      <form action={apply} className={styles.codeForm}>
        <label className={styles.codeLabel} htmlFor="bag-code">
          {label}
        </label>
        <input
          id="bag-code"
          name="code"
          type="text"
          defaultValue={appliedCode ?? ''}
          className={styles.codeInput}
          autoComplete="off"
          autoCapitalize="characters"
        />
        <button type="submit" className={styles.codeApply} disabled={pending}>
          {applyLabel}
        </button>
      </form>
      {state !== null && state.ok && state.code !== undefined && appliedMessage !== null && (
        <p className={styles.codeOk} role="status">
          {appliedMessage.replace('{code}', state.code)}
        </p>
      )}
      {cleared && (
        <p className={styles.codeOk} role="status">
          {clearMessage}
        </p>
      )}
      {failed !== null && (
        <p className={styles.problem} role="alert">
          {failed}
        </p>
      )}
      {standing !== null && (
        <p className={styles.problem} role="alert">
          {standing}
        </p>
      )}
    </div>
  )
}
