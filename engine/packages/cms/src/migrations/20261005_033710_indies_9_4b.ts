import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   ALTER TYPE "public"."enum_redirects_code" ADD VALUE '410';
  ALTER TABLE "redirects" ALTER COLUMN "to" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "redirects" ALTER COLUMN "code" SET DATA TYPE text;
  ALTER TABLE "redirects" ALTER COLUMN "code" SET DEFAULT '301'::text;
  DROP TYPE "public"."enum_redirects_code";
  CREATE TYPE "public"."enum_redirects_code" AS ENUM('301', '302');
  ALTER TABLE "redirects" ALTER COLUMN "code" SET DEFAULT '301'::"public"."enum_redirects_code";
  ALTER TABLE "redirects" ALTER COLUMN "code" SET DATA TYPE "public"."enum_redirects_code" USING "code"::"public"."enum_redirects_code";
  ALTER TABLE "redirects" ALTER COLUMN "to" SET NOT NULL;`)
}
