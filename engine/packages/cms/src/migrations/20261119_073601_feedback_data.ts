import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_themes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_themes_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__themes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__themes_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum__themes_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_stores_region" AS ENUM('lombok', 'ubud', 'amed', 'canggu', 'other');
  CREATE TYPE "public"."enum_leads_partnership_type" AS ENUM('retailer', 'wholesale');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_articles_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum__articles_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_site_settings_shop_promo_time_zone" AS ENUM('Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura');
  ALTER TYPE "public"."enum_leads_kind" ADD VALUE 'newsletter';
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"themes_id" integer
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"themes_id" integer
  );
  
  CREATE TABLE "themes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"image_id" integer,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_themes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "themes_locales" (
  	"label" varchar,
  	"translation_status" "enum_themes_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_themes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_image_id" integer,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__themes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__themes_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_themes_v_locales" (
  	"version_label" varchar,
  	"version_translation_status" "enum__themes_v_version_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cover_id" integer,
  	"pdf_id" integer,
  	"date" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"translation_status" "enum_articles_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_cover_id" integer,
  	"version_pdf_id" integer,
  	"version_date" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articles_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_articles_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_translation_status" "enum__articles_v_version_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "best_seller" boolean DEFAULT false;
  ALTER TABLE "_products_v" ADD COLUMN "version_best_seller" boolean DEFAULT false;
  ALTER TABLE "categories" ADD COLUMN "wall_decor" boolean DEFAULT false;
  ALTER TABLE "_categories_v" ADD COLUMN "version_wall_decor" boolean DEFAULT false;
  ALTER TABLE "stores" ADD COLUMN "flagship" boolean DEFAULT false;
  ALTER TABLE "stores" ADD COLUMN "region" "enum_stores_region";
  ALTER TABLE "leads" ADD COLUMN "partnership_type" "enum_leads_partnership_type";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "themes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "shop_promo_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "shop_promo_cutoff" varchar DEFAULT '15:30';
  ALTER TABLE "site_settings" ADD COLUMN "shop_promo_time_zone" "enum_site_settings_shop_promo_time_zone" DEFAULT 'Asia/Makassar';
  ALTER TABLE "site_settings" ADD COLUMN "shop_promo_weekdays_only" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "shop_newsletter_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_contact_address" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_promo_text" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_promo_condition" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_newsletter_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_newsletter_text" varchar;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "themes" ADD CONSTRAINT "themes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "themes_locales" ADD CONSTRAINT "themes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_themes_v" ADD CONSTRAINT "_themes_v_parent_id_themes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_themes_v" ADD CONSTRAINT "_themes_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_themes_v_locales" ADD CONSTRAINT "_themes_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_themes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_pdf_id_media_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_pdf_id_media_id_fk" FOREIGN KEY ("version_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_themes_id_idx" ON "products_rels" USING btree ("themes_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_themes_id_idx" ON "_products_v_rels" USING btree ("themes_id");
  CREATE INDEX "themes__order_idx" ON "themes" USING btree ("_order");
  CREATE INDEX "themes_image_idx" ON "themes" USING btree ("image_id");
  CREATE UNIQUE INDEX "themes_slug_idx" ON "themes" USING btree ("slug");
  CREATE INDEX "themes_updated_at_idx" ON "themes" USING btree ("updated_at");
  CREATE INDEX "themes_created_at_idx" ON "themes" USING btree ("created_at");
  CREATE INDEX "themes__status_idx" ON "themes" USING btree ("_status");
  CREATE UNIQUE INDEX "themes_locales_locale_parent_id_unique" ON "themes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_themes_v_parent_idx" ON "_themes_v" USING btree ("parent_id");
  CREATE INDEX "_themes_v_version_version__order_idx" ON "_themes_v" USING btree ("version__order");
  CREATE INDEX "_themes_v_version_version_image_idx" ON "_themes_v" USING btree ("version_image_id");
  CREATE INDEX "_themes_v_version_version_slug_idx" ON "_themes_v" USING btree ("version_slug");
  CREATE INDEX "_themes_v_version_version_updated_at_idx" ON "_themes_v" USING btree ("version_updated_at");
  CREATE INDEX "_themes_v_version_version_created_at_idx" ON "_themes_v" USING btree ("version_created_at");
  CREATE INDEX "_themes_v_version_version__status_idx" ON "_themes_v" USING btree ("version__status");
  CREATE INDEX "_themes_v_created_at_idx" ON "_themes_v" USING btree ("created_at");
  CREATE INDEX "_themes_v_updated_at_idx" ON "_themes_v" USING btree ("updated_at");
  CREATE INDEX "_themes_v_snapshot_idx" ON "_themes_v" USING btree ("snapshot");
  CREATE INDEX "_themes_v_published_locale_idx" ON "_themes_v" USING btree ("published_locale");
  CREATE INDEX "_themes_v_latest_idx" ON "_themes_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_themes_v_locales_locale_parent_id_unique" ON "_themes_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_cover_idx" ON "articles" USING btree ("cover_id");
  CREATE INDEX "articles_pdf_idx" ON "articles" USING btree ("pdf_id");
  CREATE INDEX "articles_date_idx" ON "articles" USING btree ("date");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_cover_idx" ON "_articles_v" USING btree ("version_cover_id");
  CREATE INDEX "_articles_v_version_version_pdf_idx" ON "_articles_v" USING btree ("version_pdf_id");
  CREATE INDEX "_articles_v_version_version_date_idx" ON "_articles_v" USING btree ("version_date");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_best_seller_idx" ON "products" USING btree ("best_seller");
  CREATE INDEX "_products_v_version_version_best_seller_idx" ON "_products_v" USING btree ("version_best_seller");
  CREATE INDEX "categories_wall_decor_idx" ON "categories" USING btree ("wall_decor");
  CREATE INDEX "_categories_v_version_version_wall_decor_idx" ON "_categories_v" USING btree ("version_wall_decor");
  CREATE INDEX "payload_locked_documents_rels_themes_id_idx" ON "payload_locked_documents_rels" USING btree ("themes_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "themes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "themes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_themes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_themes_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "themes" CASCADE;
  DROP TABLE "themes_locales" CASCADE;
  DROP TABLE "_themes_v" CASCADE;
  DROP TABLE "_themes_v_locales" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_themes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_articles_fk";
  
  -- A newsletter sign-up has no kind to go back to: it leaves with the kind (TASKS.md 28.1).
  DELETE FROM "leads" WHERE "kind" = 'newsletter';
  ALTER TABLE "leads" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_leads_kind";
  CREATE TYPE "public"."enum_leads_kind" AS ENUM('ask', 'sell', 'partnership', 'contact', 'chat');
  ALTER TABLE "leads" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_leads_kind" USING "kind"::"public"."enum_leads_kind";
  DROP INDEX "products_best_seller_idx";
  DROP INDEX "_products_v_version_version_best_seller_idx";
  DROP INDEX "categories_wall_decor_idx";
  DROP INDEX "_categories_v_version_version_wall_decor_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_themes_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_articles_id_idx";
  ALTER TABLE "products" DROP COLUMN "best_seller";
  ALTER TABLE "_products_v" DROP COLUMN "version_best_seller";
  ALTER TABLE "categories" DROP COLUMN "wall_decor";
  ALTER TABLE "_categories_v" DROP COLUMN "version_wall_decor";
  ALTER TABLE "stores" DROP COLUMN "flagship";
  ALTER TABLE "stores" DROP COLUMN "region";
  ALTER TABLE "leads" DROP COLUMN "partnership_type";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "themes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "articles_id";
  ALTER TABLE "site_settings" DROP COLUMN "shop_promo_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "shop_promo_cutoff";
  ALTER TABLE "site_settings" DROP COLUMN "shop_promo_time_zone";
  ALTER TABLE "site_settings" DROP COLUMN "shop_promo_weekdays_only";
  ALTER TABLE "site_settings" DROP COLUMN "shop_newsletter_enabled";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_contact_address";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_promo_text";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_promo_condition";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_newsletter_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_newsletter_text";
  DROP TYPE "public"."enum_themes_status";
  DROP TYPE "public"."enum_themes_translation_status";
  DROP TYPE "public"."enum__themes_v_version_status";
  DROP TYPE "public"."enum__themes_v_published_locale";
  DROP TYPE "public"."enum__themes_v_version_translation_status";
  DROP TYPE "public"."enum_stores_region";
  DROP TYPE "public"."enum_leads_partnership_type";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum_articles_translation_status";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum__articles_v_version_translation_status";
  DROP TYPE "public"."enum_site_settings_shop_promo_time_zone";`)
}
