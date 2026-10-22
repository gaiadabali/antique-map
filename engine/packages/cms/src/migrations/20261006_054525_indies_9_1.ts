import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TABLE "partners_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  ALTER TABLE "partners_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "partners_texts" CASCADE;
  ALTER TABLE "leads" ADD COLUMN "partner_id" integer;
  ALTER TABLE "leads" ADD COLUMN "closed_at" timestamp(3) with time zone;
  ALTER TABLE "partners_rels" ADD CONSTRAINT "partners_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners_rels" ADD CONSTRAINT "partners_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "partners_rels_order_idx" ON "partners_rels" USING btree ("order");
  CREATE INDEX "partners_rels_parent_idx" ON "partners_rels" USING btree ("parent_id");
  CREATE INDEX "partners_rels_path_idx" ON "partners_rels" USING btree ("path");
  CREATE INDEX "partners_rels_products_id_idx" ON "partners_rels" USING btree ("products_id");
  ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "leads_partner_idx" ON "leads" USING btree ("partner_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "partners_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "partners_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "partners_rels" CASCADE;
  ALTER TABLE "leads" DROP CONSTRAINT "leads_partner_id_partners_id_fk";
  
  DROP INDEX "leads_partner_idx";
  ALTER TABLE "partners_texts" ADD CONSTRAINT "partners_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "partners_texts_order_parent" ON "partners_texts" USING btree ("order","parent_id");
  ALTER TABLE "leads" DROP COLUMN "partner_id";
  ALTER TABLE "leads" DROP COLUMN "closed_at";`)
}
