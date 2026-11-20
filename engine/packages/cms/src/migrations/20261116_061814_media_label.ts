import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   ALTER TABLE "media_locales" ADD COLUMN "label" varchar;`)
  // The records already saved get the label a save would give them (`cms-core`'s media `./label`).
  await db.execute(sql`
   UPDATE "media_locales" AS l SET "label" = COALESCE(
     NULLIF(btrim(CASE WHEN m."kind"::text = 'image' THEN l."alt" ELSE l."title" END), ''),
     m."filename")
   FROM "media" AS m WHERE m."id" = l."_parent_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media_locales" DROP COLUMN "label";`)
}
