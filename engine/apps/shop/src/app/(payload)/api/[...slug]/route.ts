/**
 * Payload's REST API for the shop's CMS (C13). GraphQL is off (`graphQL.disable`); engine routes
 * live under `/api/x/` (TASKS.md 23.4), which no collection may be named.
 */
import config from '@engine/cms-shop/payload.config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
