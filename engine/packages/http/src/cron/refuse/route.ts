/**
 * `@engine/http/cron/refuse` — the cron routes' bearer check (`../auth`), for an app that mounts a
 * cron handler of its own CMS's (the shop's payment sweeps and reconcile, `@engine/cms-shop/payments/http`,
 * TASKS.md 23.4): `paymentSweepsRoute({ refuse: refuseCron })`.
 */
export { refuseCron } from '../auth'
