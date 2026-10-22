import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   ALTER TABLE "partners" ADD COLUMN "sign_in_enabled" boolean DEFAULT false;
  ALTER TABLE "partners" ADD COLUMN "sign_in_email" varchar;
  ALTER TABLE "partners" ADD COLUMN "sign_in_locked_until" timestamp(3) with time zone;
  ALTER TABLE "partners" ADD COLUMN "sign_in_password_hash" varchar;
  ALTER TABLE "partners" ADD COLUMN "sign_in_failed_attempts" numeric DEFAULT 0;
  ALTER TABLE "partners" ADD COLUMN "sign_in_session_version" numeric DEFAULT 0;
  CREATE UNIQUE INDEX "partners_sign_in_sign_in_email_idx" ON "partners" USING btree ("sign_in_email");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "partners_sign_in_sign_in_email_idx";
  ALTER TABLE "partners" DROP COLUMN "sign_in_enabled";
  ALTER TABLE "partners" DROP COLUMN "sign_in_email";
  ALTER TABLE "partners" DROP COLUMN "sign_in_locked_until";
  ALTER TABLE "partners" DROP COLUMN "sign_in_password_hash";
  ALTER TABLE "partners" DROP COLUMN "sign_in_failed_attempts";
  ALTER TABLE "partners" DROP COLUMN "sign_in_session_version";`)
}
