import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   ALTER TABLE "pages_blocks_enquiry" ALTER COLUMN "anchor" SET DEFAULT 'apply';
  ALTER TABLE "_pages_v_blocks_enquiry" ALTER COLUMN "anchor" SET DEFAULT 'apply';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_enquiry" ALTER COLUMN "anchor" SET DEFAULT 'enquire';
  ALTER TABLE "_pages_v_blocks_enquiry" ALTER COLUMN "anchor" SET DEFAULT 'enquire';`)
}
