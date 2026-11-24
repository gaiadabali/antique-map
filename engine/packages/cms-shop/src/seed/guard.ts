/**
 * The shop seed's database check (PLAN-V2 §4.4: one app, one database): it refuses a database that
 * holds today's one CMS or the gallery's — one with a `works` table — so a seed pointed at the
 * wrong `DATABASE_URL` (a worktree's `.env.local` names today's) stops before its first write,
 * instead of mixing the shop's rows into another schema. Its message names the database, never
 * the address (which carries the password).
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

type Execute = (args: { db: unknown; sql: ReturnType<typeof sql> }) => Promise<{
  rows?: Array<Record<string, unknown>>
}>

export async function shopDatabaseRefusal(payload: Payload): Promise<string | null> {
  const db = payload.db as unknown as { drizzle: unknown; execute: Execute }
  const result = await db.execute({
    db: db.drizzle,
    sql: sql`select current_database() as name, to_regclass('public.works') is not null as works`,
  })
  const row = result.rows?.[0] ?? {}
  if (row.works !== true) return null
  return (
    `The database '${String(row.name)}' holds the gallery's works: it is not the shop's. ` +
    'Point DATABASE_URL at the shop database (indies_shop_<suffix>) and run again.'
  )
}
