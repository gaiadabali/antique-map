/**
 * `POST /api/x/cron/reconcile` — mounted by every app (C13), built by PAY. Until then it
 * authenticates like every cron route and answers 404.
 */
import { unbuiltCron } from '../auth'

export const POST = unbuiltCron('PAY')
