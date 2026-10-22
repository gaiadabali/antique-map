import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_title_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_description_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_object_type_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_date_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_places_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_subjects_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_dimensions_verified" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_run_requested_by_id" integer;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_run_requested_at" timestamp(3) with time zone;
  ALTER TABLE "works" ADD COLUMN "cataloguing_ai_draft_run_record" jsonb;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_title_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_description_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_object_type_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_date_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_places_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_subjects_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_dimensions_verified" boolean DEFAULT false;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_run_requested_by_id" integer;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_run_requested_at" timestamp(3) with time zone;
  ALTER TABLE "_works_v" ADD COLUMN "version_cataloguing_ai_draft_run_record" jsonb;
  ALTER TABLE "works" ADD CONSTRAINT "works_cataloguing_ai_draft_run_requested_by_id_users_id_fk" FOREIGN KEY ("cataloguing_ai_draft_run_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_cataloguing_ai_draft_run_requested_by_id_users_id_fk" FOREIGN KEY ("version_cataloguing_ai_draft_run_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "works_cataloguing_ai_draft_run_cataloguing_ai_draft_run__idx" ON "works" USING btree ("cataloguing_ai_draft_run_requested_by_id");
  CREATE INDEX "_works_v_version_cataloguing_ai_draft_run_version_catalo_idx" ON "_works_v" USING btree ("version_cataloguing_ai_draft_run_requested_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "works" DROP CONSTRAINT "works_cataloguing_ai_draft_run_requested_by_id_users_id_fk";
  
  ALTER TABLE "_works_v" DROP CONSTRAINT "_works_v_version_cataloguing_ai_draft_run_requested_by_id_users_id_fk";
  
  DROP INDEX "works_cataloguing_ai_draft_run_cataloguing_ai_draft_run__idx";
  DROP INDEX "_works_v_version_cataloguing_ai_draft_run_version_catalo_idx";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_title_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_description_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_object_type_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_date_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_places_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_subjects_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_dimensions_verified";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_run_requested_by_id";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_run_requested_at";
  ALTER TABLE "works" DROP COLUMN "cataloguing_ai_draft_run_record";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_title_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_description_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_object_type_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_date_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_places_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_subjects_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_dimensions_verified";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_run_requested_by_id";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_run_requested_at";
  ALTER TABLE "_works_v" DROP COLUMN "version_cataloguing_ai_draft_run_record";`)
}
