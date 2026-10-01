import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_makers_roles" AS ENUM('cartographer', 'engraver', 'publisher', 'author', 'artist', 'photographer', 'studio', 'printer');
  CREATE TYPE "public"."enum_makers_born_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_makers_died_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_makers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_makers_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__makers_v_version_roles" AS ENUM('cartographer', 'engraver', 'publisher', 'author', 'artist', 'photographer', 'studio', 'printer');
  CREATE TYPE "public"."enum__makers_v_version_born_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__makers_v_version_died_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__makers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__makers_v_published_locale" AS ENUM('en', 'id', 'nl');
  CREATE TYPE "public"."enum__makers_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_places_type" AS ENUM('region', 'country', 'island-group', 'island', 'province', 'kingdom', 'city', 'town', 'sea', 'strait', 'ocean');
  CREATE TYPE "public"."enum_places_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_places_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__places_v_version_type" AS ENUM('region', 'country', 'island-group', 'island', 'province', 'kingdom', 'city', 'town', 'sea', 'strait', 'ocean');
  CREATE TYPE "public"."enum__places_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__places_v_published_locale" AS ENUM('en', 'id', 'nl');
  CREATE TYPE "public"."enum__places_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_terms_kind" AS ENUM('subject', 'mood', 'room', 'occasion', 'recipient', 'grade');
  CREATE TYPE "public"."enum_terms_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_terms_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__terms_v_version_kind" AS ENUM('subject', 'mood', 'room', 'occasion', 'recipient', 'grade');
  CREATE TYPE "public"."enum__terms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__terms_v_published_locale" AS ENUM('en', 'id', 'nl');
  CREATE TYPE "public"."enum__terms_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_published_locale" AS ENUM('en', 'id', 'nl');
  CREATE TYPE "public"."enum_media_role" AS ENUM('recto', 'verso', 'detail', 'raking', 'transmitted', 'framed', 'in-room', 'scale', 'flat', 'lifestyle', 'packaging', 'showroom', 'room-plate', 'editorial');
  CREATE TYPE "public"."enum_media_provenance" AS ENUM('photograph', 'composite', 'rendered', 'ai-generated');
  CREATE TYPE "public"."enum_media_derivatives_status" AS ENUM('pending', 'ready', 'failed');
  CREATE TYPE "public"."enum_media_iiif_status" AS ENUM('none', 'pending', 'ready', 'failed');
  CREATE TYPE "public"."enum_media_alt_source" AS ENUM('baseline', 'cataloguer', 'ai-draft');
  CREATE TYPE "public"."enum_media_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_masters_kind" AS ENUM('capture', 'print-file');
  CREATE TYPE "public"."enum_masters_role" AS ENUM('recto', 'verso', 'detail', 'raking', 'transmitted', 'framed', 'in-room', 'scale', 'flat', 'lifestyle', 'packaging', 'showroom', 'room-plate', 'editorial', 'reference');
  CREATE TYPE "public"."enum_masters_provenance" AS ENUM('photograph', 'composite', 'rendered', 'ai-generated');
  CREATE TYPE "public"."enum_masters_capture_tier" AS ENUM('good', 'better', 'best');
  CREATE TYPE "public"."enum_masters_intake_verdict" AS ENUM('pass', 'fix-owner', 'legacy');
  CREATE TYPE "public"."enum_masters_intake_retouching" AS ENUM('none', 'unknown', 'retouched-legacy');
  CREATE TABLE "makers_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "makers_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_makers_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "makers_same_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "makers_locales" (
  	"born_display" varchar,
  	"died_display" varchar,
  	"nationality" varchar,
  	"translation_status" "enum_makers_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_makers_v_version_aliases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_makers_v_version_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__makers_v_version_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_makers_v_version_same_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_makers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_sort_name" varchar,
  	"version_slug" varchar,
  	"version_born_precision" "enum__makers_v_version_born_precision" DEFAULT 'unknown',
  	"version_born_from" numeric,
  	"version_born_to" numeric,
  	"version_died_precision" "enum__makers_v_version_died_precision" DEFAULT 'unknown',
  	"version_died_from" numeric,
  	"version_died_to" numeric,
  	"version_portrait_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__makers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__makers_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_makers_v_locales" (
  	"version_born_display" varchar,
  	"version_died_display" varchar,
  	"version_nationality" varchar,
  	"version_translation_status" "enum__makers_v_version_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "places_historical_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"language" varchar,
  	"period" varchar
  );
  
  CREATE TABLE "places_locales" (
  	"name" varchar,
  	"translation_status" "enum_places_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_places_v_version_historical_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"language" varchar,
  	"period" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_places_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_type" "enum__places_v_version_type",
  	"version_parent_id" integer,
  	"version_geo_lat" numeric,
  	"version_geo_lng" numeric,
  	"version_geo_bbox_west" numeric,
  	"version_geo_bbox_south" numeric,
  	"version_geo_bbox_east" numeric,
  	"version_geo_bbox_north" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__places_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__places_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_places_v_locales" (
  	"version_name" varchar,
  	"version_translation_status" "enum__places_v_version_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "terms_locales" (
  	"label" varchar,
  	"definition" varchar,
  	"translation_status" "enum_terms_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_terms_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_kind" "enum__terms_v_version_kind",
  	"version_slug" varchar,
  	"version_equivalent" varchar,
  	"version_position" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__terms_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__terms_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_terms_v_locales" (
  	"version_label" varchar,
  	"version_definition" varchar,
  	"version_translation_status" "enum__terms_v_version_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_sources_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_short_cite" varchar,
  	"version_slug" varchar,
  	"version_citation" varchar,
  	"version_year" numeric,
  	"version_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__sources_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__sources_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"alt_source" "enum_media_alt_source" DEFAULT 'cataloguer',
  	"translation_status" "enum_media_translation_status" DEFAULT 'entered',
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "masters_intake_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"note" varchar NOT NULL
  );
  
  ALTER TABLE "makers" ADD COLUMN "name" varchar;
  ALTER TABLE "makers" ADD COLUMN "sort_name" varchar;
  ALTER TABLE "makers" ADD COLUMN "slug" varchar;
  ALTER TABLE "makers" ADD COLUMN "born_precision" "enum_makers_born_precision" DEFAULT 'unknown';
  ALTER TABLE "makers" ADD COLUMN "born_from" numeric;
  ALTER TABLE "makers" ADD COLUMN "born_to" numeric;
  ALTER TABLE "makers" ADD COLUMN "died_precision" "enum_makers_died_precision" DEFAULT 'unknown';
  ALTER TABLE "makers" ADD COLUMN "died_from" numeric;
  ALTER TABLE "makers" ADD COLUMN "died_to" numeric;
  ALTER TABLE "makers" ADD COLUMN "portrait_id" integer;
  ALTER TABLE "makers" ADD COLUMN "_status" "enum_makers_status" DEFAULT 'draft';
  ALTER TABLE "places" ADD COLUMN "slug" varchar;
  ALTER TABLE "places" ADD COLUMN "type" "enum_places_type";
  ALTER TABLE "places" ADD COLUMN "parent_id" integer;
  ALTER TABLE "places" ADD COLUMN "geo_lat" numeric;
  ALTER TABLE "places" ADD COLUMN "geo_lng" numeric;
  ALTER TABLE "places" ADD COLUMN "geo_bbox_west" numeric;
  ALTER TABLE "places" ADD COLUMN "geo_bbox_south" numeric;
  ALTER TABLE "places" ADD COLUMN "geo_bbox_east" numeric;
  ALTER TABLE "places" ADD COLUMN "geo_bbox_north" numeric;
  ALTER TABLE "places" ADD COLUMN "_status" "enum_places_status" DEFAULT 'draft';
  ALTER TABLE "terms" ADD COLUMN "kind" "enum_terms_kind";
  ALTER TABLE "terms" ADD COLUMN "slug" varchar;
  ALTER TABLE "terms" ADD COLUMN "equivalent" varchar;
  ALTER TABLE "terms" ADD COLUMN "position" numeric;
  ALTER TABLE "terms" ADD COLUMN "_status" "enum_terms_status" DEFAULT 'draft';
  ALTER TABLE "sources" ADD COLUMN "short_cite" varchar;
  ALTER TABLE "sources" ADD COLUMN "slug" varchar;
  ALTER TABLE "sources" ADD COLUMN "citation" varchar;
  ALTER TABLE "sources" ADD COLUMN "year" numeric;
  ALTER TABLE "sources" ADD COLUMN "url" varchar;
  ALTER TABLE "sources" ADD COLUMN "_status" "enum_sources_status" DEFAULT 'draft';
  ALTER TABLE "media" ADD COLUMN "credit" varchar;
  ALTER TABLE "media" ADD COLUMN "licence" varchar;
  ALTER TABLE "media" ADD COLUMN "role" "enum_media_role" NOT NULL;
  ALTER TABLE "media" ADD COLUMN "provenance" "enum_media_provenance" NOT NULL;
  ALTER TABLE "media" ADD COLUMN "master_id" integer;
  ALTER TABLE "media" ADD COLUMN "asset_id" varchar;
  ALTER TABLE "media" ADD COLUMN "derivatives_status" "enum_media_derivatives_status" DEFAULT 'pending';
  ALTER TABLE "media" ADD COLUMN "derivatives_version" varchar;
  ALTER TABLE "media" ADD COLUMN "derivatives_blur_data_uri" varchar;
  ALTER TABLE "media" ADD COLUMN "iiif_status" "enum_media_iiif_status" DEFAULT 'none';
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'uploads';
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "media" ADD COLUMN "url" varchar;
  ALTER TABLE "media" ADD COLUMN "thumbnail_u_r_l" varchar;
  ALTER TABLE "media" ADD COLUMN "filename" varchar;
  ALTER TABLE "media" ADD COLUMN "mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "width" numeric;
  ALTER TABLE "media" ADD COLUMN "height" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_x" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_y" numeric;
  ALTER TABLE "masters" ADD COLUMN "kind" "enum_masters_kind" NOT NULL;
  ALTER TABLE "masters" ADD COLUMN "storage_key" varchar NOT NULL;
  ALTER TABLE "masters" ADD COLUMN "checksum" varchar NOT NULL;
  ALTER TABLE "masters" ADD COLUMN "byte_size" numeric;
  ALTER TABLE "masters" ADD COLUMN "content_type" varchar;
  ALTER TABLE "masters" ADD COLUMN "width_px" numeric;
  ALTER TABLE "masters" ADD COLUMN "height_px" numeric;
  ALTER TABLE "masters" ADD COLUMN "colour_profile" varchar;
  ALTER TABLE "masters" ADD COLUMN "brand" varchar NOT NULL;
  ALTER TABLE "masters" ADD COLUMN "work_id" integer;
  ALTER TABLE "masters" ADD COLUMN "design_id" integer;
  ALTER TABLE "masters" ADD COLUMN "role" "enum_masters_role";
  ALTER TABLE "masters" ADD COLUMN "provenance" "enum_masters_provenance";
  ALTER TABLE "masters" ADD COLUMN "object_box_x" numeric;
  ALTER TABLE "masters" ADD COLUMN "object_box_y" numeric;
  ALTER TABLE "masters" ADD COLUMN "object_box_width" numeric;
  ALTER TABLE "masters" ADD COLUMN "object_box_height" numeric;
  ALTER TABLE "masters" ADD COLUMN "object_ppi" numeric;
  ALTER TABLE "masters" ADD COLUMN "capture_tier" "enum_masters_capture_tier";
  ALTER TABLE "masters" ADD COLUMN "intake_batch" varchar;
  ALTER TABLE "masters" ADD COLUMN "intake_reference" varchar;
  ALTER TABLE "masters" ADD COLUMN "intake_received_as" varchar;
  ALTER TABLE "masters" ADD COLUMN "intake_verdict" "enum_masters_intake_verdict";
  ALTER TABLE "masters" ADD COLUMN "intake_retouching" "enum_masters_intake_retouching";
  ALTER TABLE "makers_aliases" ADD CONSTRAINT "makers_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers_roles" ADD CONSTRAINT "makers_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers_same_as" ADD CONSTRAINT "makers_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers_locales" ADD CONSTRAINT "makers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v_version_aliases" ADD CONSTRAINT "_makers_v_version_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v_version_roles" ADD CONSTRAINT "_makers_v_version_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v_version_same_as" ADD CONSTRAINT "_makers_v_version_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v" ADD CONSTRAINT "_makers_v_parent_id_makers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."makers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_makers_v" ADD CONSTRAINT "_makers_v_version_portrait_id_media_id_fk" FOREIGN KEY ("version_portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_makers_v_locales" ADD CONSTRAINT "_makers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_historical_names" ADD CONSTRAINT "places_historical_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_locales" ADD CONSTRAINT "places_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_historical_names" ADD CONSTRAINT "_places_v_version_historical_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_version_parent_id_places_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v_locales" ADD CONSTRAINT "_places_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "terms_locales" ADD CONSTRAINT "terms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_terms_v" ADD CONSTRAINT "_terms_v_parent_id_terms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_terms_v_locales" ADD CONSTRAINT "_terms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "masters_intake_notes" ADD CONSTRAINT "masters_intake_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "makers_aliases_order_idx" ON "makers_aliases" USING btree ("_order");
  CREATE INDEX "makers_aliases_parent_id_idx" ON "makers_aliases" USING btree ("_parent_id");
  CREATE INDEX "makers_roles_order_idx" ON "makers_roles" USING btree ("order");
  CREATE INDEX "makers_roles_parent_idx" ON "makers_roles" USING btree ("parent_id");
  CREATE INDEX "makers_same_as_order_idx" ON "makers_same_as" USING btree ("_order");
  CREATE INDEX "makers_same_as_parent_id_idx" ON "makers_same_as" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "makers_locales_locale_parent_id_unique" ON "makers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_makers_v_version_aliases_order_idx" ON "_makers_v_version_aliases" USING btree ("_order");
  CREATE INDEX "_makers_v_version_aliases_parent_id_idx" ON "_makers_v_version_aliases" USING btree ("_parent_id");
  CREATE INDEX "_makers_v_version_roles_order_idx" ON "_makers_v_version_roles" USING btree ("order");
  CREATE INDEX "_makers_v_version_roles_parent_idx" ON "_makers_v_version_roles" USING btree ("parent_id");
  CREATE INDEX "_makers_v_version_same_as_order_idx" ON "_makers_v_version_same_as" USING btree ("_order");
  CREATE INDEX "_makers_v_version_same_as_parent_id_idx" ON "_makers_v_version_same_as" USING btree ("_parent_id");
  CREATE INDEX "_makers_v_parent_idx" ON "_makers_v" USING btree ("parent_id");
  CREATE INDEX "_makers_v_version_version_sort_name_idx" ON "_makers_v" USING btree ("version_sort_name");
  CREATE INDEX "_makers_v_version_version_slug_idx" ON "_makers_v" USING btree ("version_slug");
  CREATE INDEX "_makers_v_version_version_portrait_idx" ON "_makers_v" USING btree ("version_portrait_id");
  CREATE INDEX "_makers_v_version_version_updated_at_idx" ON "_makers_v" USING btree ("version_updated_at");
  CREATE INDEX "_makers_v_version_version_created_at_idx" ON "_makers_v" USING btree ("version_created_at");
  CREATE INDEX "_makers_v_version_version__status_idx" ON "_makers_v" USING btree ("version__status");
  CREATE INDEX "_makers_v_created_at_idx" ON "_makers_v" USING btree ("created_at");
  CREATE INDEX "_makers_v_updated_at_idx" ON "_makers_v" USING btree ("updated_at");
  CREATE INDEX "_makers_v_snapshot_idx" ON "_makers_v" USING btree ("snapshot");
  CREATE INDEX "_makers_v_published_locale_idx" ON "_makers_v" USING btree ("published_locale");
  CREATE INDEX "_makers_v_latest_idx" ON "_makers_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_makers_v_locales_locale_parent_id_unique" ON "_makers_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "places_historical_names_order_idx" ON "places_historical_names" USING btree ("_order");
  CREATE INDEX "places_historical_names_parent_id_idx" ON "places_historical_names" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "places_locales_locale_parent_id_unique" ON "places_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_places_v_version_historical_names_order_idx" ON "_places_v_version_historical_names" USING btree ("_order");
  CREATE INDEX "_places_v_version_historical_names_parent_id_idx" ON "_places_v_version_historical_names" USING btree ("_parent_id");
  CREATE INDEX "_places_v_parent_idx" ON "_places_v" USING btree ("parent_id");
  CREATE INDEX "_places_v_version_version_slug_idx" ON "_places_v" USING btree ("version_slug");
  CREATE INDEX "_places_v_version_version_parent_idx" ON "_places_v" USING btree ("version_parent_id");
  CREATE INDEX "_places_v_version_version_updated_at_idx" ON "_places_v" USING btree ("version_updated_at");
  CREATE INDEX "_places_v_version_version_created_at_idx" ON "_places_v" USING btree ("version_created_at");
  CREATE INDEX "_places_v_version_version__status_idx" ON "_places_v" USING btree ("version__status");
  CREATE INDEX "_places_v_created_at_idx" ON "_places_v" USING btree ("created_at");
  CREATE INDEX "_places_v_updated_at_idx" ON "_places_v" USING btree ("updated_at");
  CREATE INDEX "_places_v_snapshot_idx" ON "_places_v" USING btree ("snapshot");
  CREATE INDEX "_places_v_published_locale_idx" ON "_places_v" USING btree ("published_locale");
  CREATE INDEX "_places_v_latest_idx" ON "_places_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_places_v_locales_locale_parent_id_unique" ON "_places_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "terms_locales_locale_parent_id_unique" ON "terms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_terms_v_parent_idx" ON "_terms_v" USING btree ("parent_id");
  CREATE INDEX "_terms_v_version_version_kind_idx" ON "_terms_v" USING btree ("version_kind");
  CREATE INDEX "_terms_v_version_version_slug_idx" ON "_terms_v" USING btree ("version_slug");
  CREATE INDEX "_terms_v_version_version_position_idx" ON "_terms_v" USING btree ("version_position");
  CREATE INDEX "_terms_v_version_version_updated_at_idx" ON "_terms_v" USING btree ("version_updated_at");
  CREATE INDEX "_terms_v_version_version_created_at_idx" ON "_terms_v" USING btree ("version_created_at");
  CREATE INDEX "_terms_v_version_version__status_idx" ON "_terms_v" USING btree ("version__status");
  CREATE INDEX "_terms_v_created_at_idx" ON "_terms_v" USING btree ("created_at");
  CREATE INDEX "_terms_v_updated_at_idx" ON "_terms_v" USING btree ("updated_at");
  CREATE INDEX "_terms_v_snapshot_idx" ON "_terms_v" USING btree ("snapshot");
  CREATE INDEX "_terms_v_published_locale_idx" ON "_terms_v" USING btree ("published_locale");
  CREATE INDEX "_terms_v_latest_idx" ON "_terms_v" USING btree ("latest");
  CREATE INDEX "version_kind_version_slug_idx" ON "_terms_v" USING btree ("version_kind","version_slug");
  CREATE UNIQUE INDEX "_terms_v_locales_locale_parent_id_unique" ON "_terms_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_sources_v_parent_idx" ON "_sources_v" USING btree ("parent_id");
  CREATE INDEX "_sources_v_version_version_short_cite_idx" ON "_sources_v" USING btree ("version_short_cite");
  CREATE INDEX "_sources_v_version_version_slug_idx" ON "_sources_v" USING btree ("version_slug");
  CREATE INDEX "_sources_v_version_version_updated_at_idx" ON "_sources_v" USING btree ("version_updated_at");
  CREATE INDEX "_sources_v_version_version_created_at_idx" ON "_sources_v" USING btree ("version_created_at");
  CREATE INDEX "_sources_v_version_version__status_idx" ON "_sources_v" USING btree ("version__status");
  CREATE INDEX "_sources_v_created_at_idx" ON "_sources_v" USING btree ("created_at");
  CREATE INDEX "_sources_v_updated_at_idx" ON "_sources_v" USING btree ("updated_at");
  CREATE INDEX "_sources_v_snapshot_idx" ON "_sources_v" USING btree ("snapshot");
  CREATE INDEX "_sources_v_published_locale_idx" ON "_sources_v" USING btree ("published_locale");
  CREATE INDEX "_sources_v_latest_idx" ON "_sources_v" USING btree ("latest");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "masters_intake_notes_order_idx" ON "masters_intake_notes" USING btree ("_order");
  CREATE INDEX "masters_intake_notes_parent_id_idx" ON "masters_intake_notes" USING btree ("_parent_id");
  ALTER TABLE "makers" ADD CONSTRAINT "makers_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "places" ADD CONSTRAINT "places_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "masters" ADD CONSTRAINT "masters_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "masters" ADD CONSTRAINT "masters_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "makers_sort_name_idx" ON "makers" USING btree ("sort_name");
  CREATE UNIQUE INDEX "makers_slug_idx" ON "makers" USING btree ("slug");
  CREATE INDEX "makers_portrait_idx" ON "makers" USING btree ("portrait_id");
  CREATE INDEX "makers__status_idx" ON "makers" USING btree ("_status");
  CREATE UNIQUE INDEX "places_slug_idx" ON "places" USING btree ("slug");
  CREATE INDEX "places_parent_idx" ON "places" USING btree ("parent_id");
  CREATE INDEX "places__status_idx" ON "places" USING btree ("_status");
  CREATE INDEX "terms_kind_idx" ON "terms" USING btree ("kind");
  CREATE INDEX "terms_slug_idx" ON "terms" USING btree ("slug");
  CREATE INDEX "terms_position_idx" ON "terms" USING btree ("position");
  CREATE INDEX "terms__status_idx" ON "terms" USING btree ("_status");
  CREATE UNIQUE INDEX "kind_slug_idx" ON "terms" USING btree ("kind","slug");
  CREATE INDEX "sources_short_cite_idx" ON "sources" USING btree ("short_cite");
  CREATE UNIQUE INDEX "sources_slug_idx" ON "sources" USING btree ("slug");
  CREATE INDEX "sources__status_idx" ON "sources" USING btree ("_status");
  CREATE INDEX "media_master_idx" ON "media" USING btree ("master_id");
  CREATE INDEX "media_asset_id_idx" ON "media" USING btree ("asset_id");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "masters_storage_key_idx" ON "masters" USING btree ("storage_key");
  CREATE UNIQUE INDEX "masters_checksum_idx" ON "masters" USING btree ("checksum");
  CREATE INDEX "masters_work_idx" ON "masters" USING btree ("work_id");
  CREATE INDEX "masters_design_idx" ON "masters" USING btree ("design_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "makers_aliases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "makers_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "makers_same_as" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "makers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_makers_v_version_aliases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_makers_v_version_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_makers_v_version_same_as" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_makers_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_makers_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "places_historical_names" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "places_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_version_historical_names" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_places_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "terms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_terms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_terms_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_sources_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "masters_intake_notes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "makers_aliases" CASCADE;
  DROP TABLE "makers_roles" CASCADE;
  DROP TABLE "makers_same_as" CASCADE;
  DROP TABLE "makers_locales" CASCADE;
  DROP TABLE "_makers_v_version_aliases" CASCADE;
  DROP TABLE "_makers_v_version_roles" CASCADE;
  DROP TABLE "_makers_v_version_same_as" CASCADE;
  DROP TABLE "_makers_v" CASCADE;
  DROP TABLE "_makers_v_locales" CASCADE;
  DROP TABLE "places_historical_names" CASCADE;
  DROP TABLE "places_locales" CASCADE;
  DROP TABLE "_places_v_version_historical_names" CASCADE;
  DROP TABLE "_places_v" CASCADE;
  DROP TABLE "_places_v_locales" CASCADE;
  DROP TABLE "terms_locales" CASCADE;
  DROP TABLE "_terms_v" CASCADE;
  DROP TABLE "_terms_v_locales" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "masters_intake_notes" CASCADE;
  ALTER TABLE "makers" DROP CONSTRAINT "makers_portrait_id_media_id_fk";
  
  ALTER TABLE "places" DROP CONSTRAINT "places_parent_id_places_id_fk";
  
  ALTER TABLE "media" DROP CONSTRAINT "media_master_id_masters_id_fk";
  
  ALTER TABLE "masters" DROP CONSTRAINT "masters_work_id_works_id_fk";
  
  ALTER TABLE "masters" DROP CONSTRAINT "masters_design_id_designs_id_fk";
  
  DROP INDEX "makers_sort_name_idx";
  DROP INDEX "makers_slug_idx";
  DROP INDEX "makers_portrait_idx";
  DROP INDEX "makers__status_idx";
  DROP INDEX "places_slug_idx";
  DROP INDEX "places_parent_idx";
  DROP INDEX "places__status_idx";
  DROP INDEX "terms_kind_idx";
  DROP INDEX "terms_slug_idx";
  DROP INDEX "terms_position_idx";
  DROP INDEX "terms__status_idx";
  DROP INDEX "kind_slug_idx";
  DROP INDEX "sources_short_cite_idx";
  DROP INDEX "sources_slug_idx";
  DROP INDEX "sources__status_idx";
  DROP INDEX "media_master_idx";
  DROP INDEX "media_asset_id_idx";
  DROP INDEX "media_filename_idx";
  DROP INDEX "masters_storage_key_idx";
  DROP INDEX "masters_checksum_idx";
  DROP INDEX "masters_work_idx";
  DROP INDEX "masters_design_idx";
  ALTER TABLE "makers" DROP COLUMN "name";
  ALTER TABLE "makers" DROP COLUMN "sort_name";
  ALTER TABLE "makers" DROP COLUMN "slug";
  ALTER TABLE "makers" DROP COLUMN "born_precision";
  ALTER TABLE "makers" DROP COLUMN "born_from";
  ALTER TABLE "makers" DROP COLUMN "born_to";
  ALTER TABLE "makers" DROP COLUMN "died_precision";
  ALTER TABLE "makers" DROP COLUMN "died_from";
  ALTER TABLE "makers" DROP COLUMN "died_to";
  ALTER TABLE "makers" DROP COLUMN "portrait_id";
  ALTER TABLE "makers" DROP COLUMN "_status";
  ALTER TABLE "places" DROP COLUMN "slug";
  ALTER TABLE "places" DROP COLUMN "type";
  ALTER TABLE "places" DROP COLUMN "parent_id";
  ALTER TABLE "places" DROP COLUMN "geo_lat";
  ALTER TABLE "places" DROP COLUMN "geo_lng";
  ALTER TABLE "places" DROP COLUMN "geo_bbox_west";
  ALTER TABLE "places" DROP COLUMN "geo_bbox_south";
  ALTER TABLE "places" DROP COLUMN "geo_bbox_east";
  ALTER TABLE "places" DROP COLUMN "geo_bbox_north";
  ALTER TABLE "places" DROP COLUMN "_status";
  ALTER TABLE "terms" DROP COLUMN "kind";
  ALTER TABLE "terms" DROP COLUMN "slug";
  ALTER TABLE "terms" DROP COLUMN "equivalent";
  ALTER TABLE "terms" DROP COLUMN "position";
  ALTER TABLE "terms" DROP COLUMN "_status";
  ALTER TABLE "sources" DROP COLUMN "short_cite";
  ALTER TABLE "sources" DROP COLUMN "slug";
  ALTER TABLE "sources" DROP COLUMN "citation";
  ALTER TABLE "sources" DROP COLUMN "year";
  ALTER TABLE "sources" DROP COLUMN "url";
  ALTER TABLE "sources" DROP COLUMN "_status";
  ALTER TABLE "media" DROP COLUMN "credit";
  ALTER TABLE "media" DROP COLUMN "licence";
  ALTER TABLE "media" DROP COLUMN "role";
  ALTER TABLE "media" DROP COLUMN "provenance";
  ALTER TABLE "media" DROP COLUMN "master_id";
  ALTER TABLE "media" DROP COLUMN "asset_id";
  ALTER TABLE "media" DROP COLUMN "derivatives_status";
  ALTER TABLE "media" DROP COLUMN "derivatives_version";
  ALTER TABLE "media" DROP COLUMN "derivatives_blur_data_uri";
  ALTER TABLE "media" DROP COLUMN "iiif_status";
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "media" DROP COLUMN "url";
  ALTER TABLE "media" DROP COLUMN "thumbnail_u_r_l";
  ALTER TABLE "media" DROP COLUMN "filename";
  ALTER TABLE "media" DROP COLUMN "mime_type";
  ALTER TABLE "media" DROP COLUMN "filesize";
  ALTER TABLE "media" DROP COLUMN "width";
  ALTER TABLE "media" DROP COLUMN "height";
  ALTER TABLE "media" DROP COLUMN "focal_x";
  ALTER TABLE "media" DROP COLUMN "focal_y";
  ALTER TABLE "masters" DROP COLUMN "kind";
  ALTER TABLE "masters" DROP COLUMN "storage_key";
  ALTER TABLE "masters" DROP COLUMN "checksum";
  ALTER TABLE "masters" DROP COLUMN "byte_size";
  ALTER TABLE "masters" DROP COLUMN "content_type";
  ALTER TABLE "masters" DROP COLUMN "width_px";
  ALTER TABLE "masters" DROP COLUMN "height_px";
  ALTER TABLE "masters" DROP COLUMN "colour_profile";
  ALTER TABLE "masters" DROP COLUMN "brand";
  ALTER TABLE "masters" DROP COLUMN "work_id";
  ALTER TABLE "masters" DROP COLUMN "design_id";
  ALTER TABLE "masters" DROP COLUMN "role";
  ALTER TABLE "masters" DROP COLUMN "provenance";
  ALTER TABLE "masters" DROP COLUMN "object_box_x";
  ALTER TABLE "masters" DROP COLUMN "object_box_y";
  ALTER TABLE "masters" DROP COLUMN "object_box_width";
  ALTER TABLE "masters" DROP COLUMN "object_box_height";
  ALTER TABLE "masters" DROP COLUMN "object_ppi";
  ALTER TABLE "masters" DROP COLUMN "capture_tier";
  ALTER TABLE "masters" DROP COLUMN "intake_batch";
  ALTER TABLE "masters" DROP COLUMN "intake_reference";
  ALTER TABLE "masters" DROP COLUMN "intake_received_as";
  ALTER TABLE "masters" DROP COLUMN "intake_verdict";
  ALTER TABLE "masters" DROP COLUMN "intake_retouching";
  DROP TYPE "public"."enum_makers_roles";
  DROP TYPE "public"."enum_makers_born_precision";
  DROP TYPE "public"."enum_makers_died_precision";
  DROP TYPE "public"."enum_makers_status";
  DROP TYPE "public"."enum_makers_translation_status";
  DROP TYPE "public"."enum__makers_v_version_roles";
  DROP TYPE "public"."enum__makers_v_version_born_precision";
  DROP TYPE "public"."enum__makers_v_version_died_precision";
  DROP TYPE "public"."enum__makers_v_version_status";
  DROP TYPE "public"."enum__makers_v_published_locale";
  DROP TYPE "public"."enum__makers_v_version_translation_status";
  DROP TYPE "public"."enum_places_type";
  DROP TYPE "public"."enum_places_status";
  DROP TYPE "public"."enum_places_translation_status";
  DROP TYPE "public"."enum__places_v_version_type";
  DROP TYPE "public"."enum__places_v_version_status";
  DROP TYPE "public"."enum__places_v_published_locale";
  DROP TYPE "public"."enum__places_v_version_translation_status";
  DROP TYPE "public"."enum_terms_kind";
  DROP TYPE "public"."enum_terms_status";
  DROP TYPE "public"."enum_terms_translation_status";
  DROP TYPE "public"."enum__terms_v_version_kind";
  DROP TYPE "public"."enum__terms_v_version_status";
  DROP TYPE "public"."enum__terms_v_published_locale";
  DROP TYPE "public"."enum__terms_v_version_translation_status";
  DROP TYPE "public"."enum_sources_status";
  DROP TYPE "public"."enum__sources_v_version_status";
  DROP TYPE "public"."enum__sources_v_published_locale";
  DROP TYPE "public"."enum_media_role";
  DROP TYPE "public"."enum_media_provenance";
  DROP TYPE "public"."enum_media_derivatives_status";
  DROP TYPE "public"."enum_media_iiif_status";
  DROP TYPE "public"."enum_media_alt_source";
  DROP TYPE "public"."enum_media_translation_status";
  DROP TYPE "public"."enum_masters_kind";
  DROP TYPE "public"."enum_masters_role";
  DROP TYPE "public"."enum_masters_provenance";
  DROP TYPE "public"."enum_masters_capture_tier";
  DROP TYPE "public"."enum_masters_intake_verdict";
  DROP TYPE "public"."enum_masters_intake_retouching";`)
}
