/**
 * The payment routes' ports bound to the shop's own Payload (`../../../instance`), loaded with
 * `import()` by `./webhook` once a notification has passed its signature check, and by `./cron`
 * once the crontab's bearer has (ARCHITECTURE.md §15). Today's one CMS binds the same ports
 * (`./ports`) to its own instance.
 */
import { shopCms } from '../../../instance'
import type { PaymentsConfig } from '../config'
import { jobsPortWith, webhookPortWith } from './ports'

export const webhookPort = (config: PaymentsConfig) => webhookPortWith(shopCms, config)

export const jobsPort = () => jobsPortWith(shopCms)
