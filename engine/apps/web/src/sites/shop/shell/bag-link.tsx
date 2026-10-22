/**
 * The header's bag icon with the number of pieces in it (`bagCount()`, the signed bag cookie);
 * inside `<Suspense>`, its fallback is the same link without a number, so the shell never waits
 * on it.
 */
import { Suspense } from 'react'

import { bagCount } from '../../../server/shop/bag'
import type { ShopShellText } from './shell-messages'
import styles from './bag-link.module.css'

type Props = { readonly href: string; readonly t: ShopShellText }

export function BagLink(props: Props) {
  return (
    <Suspense fallback={<Icon {...props} count={0} />}>
      <CountedBag {...props} />
    </Suspense>
  )
}

async function CountedBag(props: Props) {
  let count = 0
  try {
    count = await bagCount()
  } catch {
    count = 0
  }
  return <Icon {...props} count={count} />
}

function Icon({ href, t, count }: Props & { readonly count: number }) {
  return (
    <a
      className={styles.bag}
      href={href}
      aria-label={
        count > 0 ? t('shell.shop.bagCount', { count: String(count) }) : t('shell.shop.bag')
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M5 8h14l-1 13H6L5 8z" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 && (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      )}
    </a>
  )
}
