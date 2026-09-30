/**
 * `POST /api/x/cron/outbox` — mounted by every app (C13), built by DOM. Until then it
 * authenticates like every cron route and answers 404.
 */
import { unbuiltCron } from '../auth'

export const POST = unbuiltCron('DOM')
