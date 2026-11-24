/**
 * The line a staff member sees above a page they preview (TASKS.md 27.5.a): that this is the
 * latest draft, and a way out of draft mode back to the same page. Drawn only when
 * `server/shop/pages/preview` verified the session; a visitor never sees it. Carries the frame's
 * refresh on save (`./refresh-on-save`).
 */
import type { SiteLocale } from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { headers } from 'next/headers'

import styles from './preview-bar.module.css'
import { RefreshOnSave } from './refresh-on-save'
import { shopShellText } from './shell-messages'

export async function PreviewBar({ locale }: { readonly locale: SiteLocale }) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath) || '/'
  const words = shopShellText(locale)
  const leave = `/api/x/preview?exit=1&path=${encodeURIComponent(path)}`
  return (
    <div className={styles.bar} role="status">
      <p>{words('shell.shop.preview')}</p>
      <a href={leave}>{words('shell.shop.previewLeave')}</a>
      <RefreshOnSave />
    </div>
  )
}
