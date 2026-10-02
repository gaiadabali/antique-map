import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_works_makers_role" AS ENUM('cartographer', 'engraver', 'publisher', 'author', 'artist', 'photographer', 'studio', 'printer');
  CREATE TYPE "public"."enum_works_makers_certainty" AS ENUM('certain', 'attributed', 'after', 'workshop');
  CREATE TYPE "public"."enum_works_places_role" AS ENUM('depicts', 'published-at', 'photographed-at');
  CREATE TYPE "public"."enum_works_cataloguing_ai_draft" AS ENUM('title', 'originalTitle', 'publication', 'date', 'makers', 'places', 'subjects', 'technique', 'colour', 'condition', 'references', 'seo');
  CREATE TYPE "public"."enum_works_object_type" AS ENUM('map', 'sea-chart', 'city-plan', 'view', 'print', 'photograph', 'book', 'atlas', 'poster', 'document', 'ethnographic', 'other');
  CREATE TYPE "public"."enum_works_date_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_works_first_edition_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_works_date_on_plate_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_works_technique" AS ENUM('woodcut', 'wood-engraving', 'copperplate-engraving', 'etching', 'steel-engraving', 'mezzotint', 'aquatint', 'lithograph', 'chromolithograph', 'offset-lithograph', 'screenprint', 'salt-print', 'albumen-print', 'gelatin-silver-print', 'collotype', 'photogravure', 'cyanotype', 'manuscript', 'other');
  CREATE TYPE "public"."enum_works_colour" AS ENUM('publishers', 'original-hand', 'old-hand', 'later', 'printed', 'uncoloured');
  CREATE TYPE "public"."enum_works_physical_export_status" AS ENUM('cleared', 'domestic-only', 'permit-pending', 'not-applicable');
  CREATE TYPE "public"."enum_works_physical_acquisition_cost_currency" AS ENUM('IDR', 'USD', 'SGD', 'EUR', 'AUD', 'GBP');
  CREATE TYPE "public"."enum_works_rights_status" AS ENUM('public-domain', 'licensed', 'rights-pending', 'restricted', 'unknown');
  CREATE TYPE "public"."enum_works_cataloguing_status" AS ENUM('draft', 'catalogued', 'verified');
  CREATE TYPE "public"."enum_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_works_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__works_v_version_makers_role" AS ENUM('cartographer', 'engraver', 'publisher', 'author', 'artist', 'photographer', 'studio', 'printer');
  CREATE TYPE "public"."enum__works_v_version_makers_certainty" AS ENUM('certain', 'attributed', 'after', 'workshop');
  CREATE TYPE "public"."enum__works_v_version_places_role" AS ENUM('depicts', 'published-at', 'photographed-at');
  CREATE TYPE "public"."enum__works_v_version_cataloguing_ai_draft" AS ENUM('title', 'originalTitle', 'publication', 'date', 'makers', 'places', 'subjects', 'technique', 'colour', 'condition', 'references', 'seo');
  CREATE TYPE "public"."enum__works_v_version_object_type" AS ENUM('map', 'sea-chart', 'city-plan', 'view', 'print', 'photograph', 'book', 'atlas', 'poster', 'document', 'ethnographic', 'other');
  CREATE TYPE "public"."enum__works_v_version_date_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__works_v_version_first_edition_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__works_v_version_date_on_plate_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__works_v_version_technique" AS ENUM('woodcut', 'wood-engraving', 'copperplate-engraving', 'etching', 'steel-engraving', 'mezzotint', 'aquatint', 'lithograph', 'chromolithograph', 'offset-lithograph', 'screenprint', 'salt-print', 'albumen-print', 'gelatin-silver-print', 'collotype', 'photogravure', 'cyanotype', 'manuscript', 'other');
  CREATE TYPE "public"."enum__works_v_version_colour" AS ENUM('publishers', 'original-hand', 'old-hand', 'later', 'printed', 'uncoloured');
  CREATE TYPE "public"."enum__works_v_version_physical_export_status" AS ENUM('cleared', 'domestic-only', 'permit-pending', 'not-applicable');
  CREATE TYPE "public"."enum__works_v_version_physical_acquisition_cost_currency" AS ENUM('IDR', 'USD', 'SGD', 'EUR', 'AUD', 'GBP');
  CREATE TYPE "public"."enum__works_v_version_rights_status" AS ENUM('public-domain', 'licensed', 'rights-pending', 'restricted', 'unknown');
  CREATE TYPE "public"."enum__works_v_version_cataloguing_status" AS ENUM('draft', 'catalogued', 'verified');
  CREATE TYPE "public"."enum__works_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__works_v_published_locale" AS ENUM('en', 'id', 'nl');
  CREATE TYPE "public"."enum__works_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TABLE "works_makers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"maker_id" integer,
  	"role" "enum_works_makers_role",
  	"certainty" "enum_works_makers_certainty"
  );
  
  CREATE TABLE "works_places" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"place_id" integer,
  	"role" "enum_works_places_role",
  	"primary" boolean
  );
  
  CREATE TABLE "works_references" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"ref" varchar
  );
  
  CREATE TABLE "works_references_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "works_provenance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"holder" varchar,
  	"period" varchar
  );
  
  CREATE TABLE "works_provenance_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "works_condition_defects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "works_condition_defects_locales" (
  	"defect" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "works_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "works_images_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "works_cataloguing_ai_draft" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_works_cataloguing_ai_draft",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "works_locales" (
  	"title" varchar,
  	"date_display" varchar,
  	"first_edition_display" varchar,
  	"date_on_plate_display" varchar,
  	"publication_verso" varchar,
  	"book_binding" varchar,
  	"book_completeness" varchar,
  	"condition_notes" varchar,
  	"condition_restoration" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"translation_status" "enum_works_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "works_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "works_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"terms_id" integer,
  	"works_id" integer
  );
  
  CREATE TABLE "_works_v_version_makers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"maker_id" integer,
  	"role" "enum__works_v_version_makers_role",
  	"certainty" "enum__works_v_version_makers_certainty",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v_version_places" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"place_id" integer,
  	"role" "enum__works_v_version_places_role",
  	"primary" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v_version_references" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"ref" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v_version_references_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_works_v_version_provenance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"holder" varchar,
  	"period" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v_version_provenance_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_works_v_version_condition_defects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v_version_condition_defects_locales" (
  	"defect" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_works_v_version_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v_version_images_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_works_v_version_cataloguing_ai_draft" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__works_v_version_cataloguing_ai_draft",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_work_uid" varchar,
  	"version_stock_number" varchar,
  	"version_original_title" varchar,
  	"version_original_title_language" varchar,
  	"version_object_type" "enum__works_v_version_object_type",
  	"version_date_precision" "enum__works_v_version_date_precision",
  	"version_date_from" numeric,
  	"version_date_to" numeric,
  	"version_first_edition_precision" "enum__works_v_version_first_edition_precision",
  	"version_first_edition_from" numeric,
  	"version_first_edition_to" numeric,
  	"version_date_on_plate_precision" "enum__works_v_version_date_on_plate_precision",
  	"version_date_on_plate_from" numeric,
  	"version_date_on_plate_to" numeric,
  	"version_publication_place" varchar,
  	"version_publication_publisher" varchar,
  	"version_publication_source_work" varchar,
  	"version_publication_edition" varchar,
  	"version_publication_state" varchar,
  	"version_publication_text_language" varchar,
  	"version_technique" "enum__works_v_version_technique",
  	"version_colour" "enum__works_v_version_colour",
  	"version_dimensions_image_height" numeric,
  	"version_dimensions_image_width" numeric,
  	"version_dimensions_sheet_height" numeric,
  	"version_dimensions_sheet_width" numeric,
  	"version_dimensions_framed_height" numeric,
  	"version_dimensions_framed_width" numeric,
  	"version_dimensions_framed_depth" numeric,
  	"version_book_pagination" varchar,
  	"version_book_plates" varchar,
  	"version_book_spine_id" integer,
  	"version_book_cover_id" integer,
  	"version_condition_grade_id" integer,
  	"version_master_id" integer,
  	"version_physical_location_id" integer,
  	"version_physical_export_status" "enum__works_v_version_physical_export_status",
  	"version_physical_coa_issued" boolean,
  	"version_physical_acquisition_source" varchar,
  	"version_physical_acquisition_consignor" varchar,
  	"version_physical_acquisition_date" timestamp(3) with time zone,
  	"version_physical_acquisition_cost_amount" numeric,
  	"version_physical_acquisition_cost_currency" "enum__works_v_version_physical_acquisition_cost_currency",
  	"version_rights_status" "enum__works_v_version_rights_status",
  	"version_rights_holder" varchar,
  	"version_rights_licence_ref" varchar,
  	"version_rights_expires" timestamp(3) with time zone,
  	"version_rights_print_allowed" boolean DEFAULT false,
  	"version_origin_brand" varchar,
  	"version_origin_work_uid" varchar,
  	"version_origin_synced_at" timestamp(3) with time zone,
  	"version_cataloguing_status" "enum__works_v_version_cataloguing_status" DEFAULT 'draft',
  	"version_cataloguing_cataloguer_id" integer,
  	"version_cataloguing_verified_at" timestamp(3) with time zone,
  	"version_legacy_product_id" numeric,
  	"version_legacy_sku" varchar,
  	"version_legacy_url" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__works_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__works_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_works_v_locales" (
  	"version_title" varchar,
  	"version_date_display" varchar,
  	"version_first_edition_display" varchar,
  	"version_date_on_plate_display" varchar,
  	"version_publication_verso" varchar,
  	"version_book_binding" varchar,
  	"version_book_completeness" varchar,
  	"version_condition_notes" varchar,
  	"version_condition_restoration" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_translation_status" "enum__works_v_version_translation_status" DEFAULT 'entered',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_works_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_works_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"terms_id" integer,
  	"works_id" integer
  );
  
  ALTER TABLE "works" ADD COLUMN "work_uid" varchar;
  ALTER TABLE "works" ADD COLUMN "stock_number" varchar;
  ALTER TABLE "works" ADD COLUMN "original_title" varchar;
  ALTER TABLE "works" ADD COLUMN "original_title_language" varchar;
  ALTER TABLE "works" ADD COLUMN "object_type" "enum_works_object_type";
  ALTER TABLE "works" ADD COLUMN "date_precision" "enum_works_date_precision";
  ALTER TABLE "works" ADD COLUMN "date_from" numeric;
  ALTER TABLE "works" ADD COLUMN "date_to" numeric;
  ALTER TABLE "works" ADD COLUMN "first_edition_precision" "enum_works_first_edition_precision";
  ALTER TABLE "works" ADD COLUMN "first_edition_from" numeric;
  ALTER TABLE "works" ADD COLUMN "first_edition_to" numeric;
  ALTER TABLE "works" ADD COLUMN "date_on_plate_precision" "enum_works_date_on_plate_precision";
  ALTER TABLE "works" ADD COLUMN "date_on_plate_from" numeric;
  ALTER TABLE "works" ADD COLUMN "date_on_plate_to" numeric;
  ALTER TABLE "works" ADD COLUMN "publication_place" varchar;
  ALTER TABLE "works" ADD COLUMN "publication_publisher" varchar;
  ALTER TABLE "works" ADD COLUMN "publication_source_work" varchar;
  ALTER TABLE "works" ADD COLUMN "publication_edition" varchar;
  ALTER TABLE "works" ADD COLUMN "publication_state" varchar;
  ALTER TABLE "works" ADD COLUMN "publication_text_language" varchar;
  ALTER TABLE "works" ADD COLUMN "technique" "enum_works_technique";
  ALTER TABLE "works" ADD COLUMN "colour" "enum_works_colour";
  ALTER TABLE "works" ADD COLUMN "dimensions_image_height" numeric;
  ALTER TABLE "works" ADD COLUMN "dimensions_image_width" numeric;
  ALTER TABLE "works" ADD COLUMN "dimensions_sheet_height" numeric;
  ALTER TABLE "works" ADD COLUMN "dimensions_sheet_width" numeric;
  ALTER TABLE "works" ADD COLUMN "dimensions_framed_height" numeric;
  ALTER TABLE "works" ADD COLUMN "dimensions_framed_width" numeric;
  ALTER TABLE "works" ADD COLUMN "dimensions_framed_depth" numeric;
  ALTER TABLE "works" ADD COLUMN "book_pagination" varchar;
  ALTER TABLE "works" ADD COLUMN "book_plates" varchar;
  ALTER TABLE "works" ADD COLUMN "book_spine_id" integer;
  ALTER TABLE "works" ADD COLUMN "book_cover_id" integer;
  ALTER TABLE "works" ADD COLUMN "condition_grade_id" integer;
  ALTER TABLE "works" ADD COLUMN "master_id" integer;
  ALTER TABLE "works" ADD COLUMN "physical_location_id" integer;
  ALTER TABLE "works" ADD COLUMN "physical_export_status" "enum_works_physical_export_status";
  ALTER TABLE "works" ADD COLUMN "physical_coa_issued" boolean;
  ALTER TABLE "works" ADD COLUMN "physical_acquisition_source" varchar;
  ALTER TABLE "works" ADD COLUMN "physical_acquisition_consignor" varchar;
  ALTER TABLE "works" ADD COLUMN "physical_acquisition_date" timestamp(3) with time zone;
  ALTER TABLE "works" ADD COLUMN "physical_acquisition_cost_amount" numeric;
  ALTER TABLE "works" ADD COLUMN "physical_acquisition_cost_currency" "enum_works_physical_acquisition_cost_currency";
  ALTER TABLE "works" ADD COLUMN "rights_status" "enum_works_rights_status";
  ALTER TABLE "works" ADD COLUMN "rights_holder" varchar;
  ALTER TABLE "works" ADD COLUMN "rights_licence_ref" varchar;
  ALTER TABLE "works" ADD COLUMN "rights_expires" timestamp(3) with time zone;
  ALTER TABLE "works" ADD COLUMN "rights_print_allowed" boolean DEFAULT false;
  ALTER TABLE "works" ADD COLUMN "origin_brand" varchar;
  ALTER TABLE "works" ADD COLUMN "origin_work_uid" varchar;
  ALTER TABLE "works" ADD COLUMN "origin_synced_at" timestamp(3) with time zone;
  ALTER TABLE "works" ADD COLUMN "cataloguing_status" "enum_works_cataloguing_status" DEFAULT 'draft';
  ALTER TABLE "works" ADD COLUMN "cataloguing_cataloguer_id" integer;
  ALTER TABLE "works" ADD COLUMN "cataloguing_verified_at" timestamp(3) with time zone;
  ALTER TABLE "works" ADD COLUMN "legacy_product_id" numeric;
  ALTER TABLE "works" ADD COLUMN "legacy_sku" varchar;
  ALTER TABLE "works" ADD COLUMN "legacy_url" varchar;
  ALTER TABLE "works" ADD COLUMN "seo_image_id" integer;
  ALTER TABLE "works" ADD COLUMN "_status" "enum_works_status" DEFAULT 'draft';
  ALTER TABLE "works_makers" ADD CONSTRAINT "works_makers_maker_id_makers_id_fk" FOREIGN KEY ("maker_id") REFERENCES "public"."makers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_makers" ADD CONSTRAINT "works_makers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_places" ADD CONSTRAINT "works_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_places" ADD CONSTRAINT "works_places_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_references" ADD CONSTRAINT "works_references_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_references" ADD CONSTRAINT "works_references_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_references_locales" ADD CONSTRAINT "works_references_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works_references"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_provenance" ADD CONSTRAINT "works_provenance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_provenance_locales" ADD CONSTRAINT "works_provenance_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works_provenance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_condition_defects" ADD CONSTRAINT "works_condition_defects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_condition_defects_locales" ADD CONSTRAINT "works_condition_defects_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works_condition_defects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_images" ADD CONSTRAINT "works_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_images" ADD CONSTRAINT "works_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_images_locales" ADD CONSTRAINT "works_images_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_cataloguing_ai_draft" ADD CONSTRAINT "works_cataloguing_ai_draft_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_locales" ADD CONSTRAINT "works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_texts" ADD CONSTRAINT "works_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_rels" ADD CONSTRAINT "works_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_rels" ADD CONSTRAINT "works_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_rels" ADD CONSTRAINT "works_rels_terms_fk" FOREIGN KEY ("terms_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_rels" ADD CONSTRAINT "works_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_makers" ADD CONSTRAINT "_works_v_version_makers_maker_id_makers_id_fk" FOREIGN KEY ("maker_id") REFERENCES "public"."makers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_version_makers" ADD CONSTRAINT "_works_v_version_makers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_places" ADD CONSTRAINT "_works_v_version_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_version_places" ADD CONSTRAINT "_works_v_version_places_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_references" ADD CONSTRAINT "_works_v_version_references_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_version_references" ADD CONSTRAINT "_works_v_version_references_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_references_locales" ADD CONSTRAINT "_works_v_version_references_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v_version_references"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_provenance" ADD CONSTRAINT "_works_v_version_provenance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_provenance_locales" ADD CONSTRAINT "_works_v_version_provenance_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v_version_provenance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_condition_defects" ADD CONSTRAINT "_works_v_version_condition_defects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_condition_defects_locales" ADD CONSTRAINT "_works_v_version_condition_defects_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v_version_condition_defects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_images" ADD CONSTRAINT "_works_v_version_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_version_images" ADD CONSTRAINT "_works_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_images_locales" ADD CONSTRAINT "_works_v_version_images_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v_version_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_cataloguing_ai_draft" ADD CONSTRAINT "_works_v_version_cataloguing_ai_draft_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_parent_id_works_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_book_spine_id_media_id_fk" FOREIGN KEY ("version_book_spine_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_book_cover_id_media_id_fk" FOREIGN KEY ("version_book_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_condition_grade_id_terms_id_fk" FOREIGN KEY ("version_condition_grade_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_master_id_masters_id_fk" FOREIGN KEY ("version_master_id") REFERENCES "public"."masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_physical_location_id_locations_id_fk" FOREIGN KEY ("version_physical_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_cataloguing_cataloguer_id_users_id_fk" FOREIGN KEY ("version_cataloguing_cataloguer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_locales" ADD CONSTRAINT "_works_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_texts" ADD CONSTRAINT "_works_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_terms_fk" FOREIGN KEY ("terms_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "works_makers_order_idx" ON "works_makers" USING btree ("_order");
  CREATE INDEX "works_makers_parent_id_idx" ON "works_makers" USING btree ("_parent_id");
  CREATE INDEX "works_makers_maker_idx" ON "works_makers" USING btree ("maker_id");
  CREATE INDEX "works_places_order_idx" ON "works_places" USING btree ("_order");
  CREATE INDEX "works_places_parent_id_idx" ON "works_places" USING btree ("_parent_id");
  CREATE INDEX "works_places_place_idx" ON "works_places" USING btree ("place_id");
  CREATE INDEX "works_references_order_idx" ON "works_references" USING btree ("_order");
  CREATE INDEX "works_references_parent_id_idx" ON "works_references" USING btree ("_parent_id");
  CREATE INDEX "works_references_source_idx" ON "works_references" USING btree ("source_id");
  CREATE UNIQUE INDEX "works_references_locales_locale_parent_id_unique" ON "works_references_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_provenance_order_idx" ON "works_provenance" USING btree ("_order");
  CREATE INDEX "works_provenance_parent_id_idx" ON "works_provenance" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "works_provenance_locales_locale_parent_id_unique" ON "works_provenance_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_condition_defects_order_idx" ON "works_condition_defects" USING btree ("_order");
  CREATE INDEX "works_condition_defects_parent_id_idx" ON "works_condition_defects" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "works_condition_defects_locales_locale_parent_id_unique" ON "works_condition_defects_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_images_order_idx" ON "works_images" USING btree ("_order");
  CREATE INDEX "works_images_parent_id_idx" ON "works_images" USING btree ("_parent_id");
  CREATE INDEX "works_images_media_idx" ON "works_images" USING btree ("media_id");
  CREATE UNIQUE INDEX "works_images_locales_locale_parent_id_unique" ON "works_images_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_cataloguing_ai_draft_order_idx" ON "works_cataloguing_ai_draft" USING btree ("order");
  CREATE INDEX "works_cataloguing_ai_draft_parent_idx" ON "works_cataloguing_ai_draft" USING btree ("parent_id");
  CREATE UNIQUE INDEX "works_locales_locale_parent_id_unique" ON "works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_texts_order_parent" ON "works_texts" USING btree ("order","parent_id");
  CREATE INDEX "works_rels_order_idx" ON "works_rels" USING btree ("order");
  CREATE INDEX "works_rels_parent_idx" ON "works_rels" USING btree ("parent_id");
  CREATE INDEX "works_rels_path_idx" ON "works_rels" USING btree ("path");
  CREATE INDEX "works_rels_media_id_idx" ON "works_rels" USING btree ("media_id");
  CREATE INDEX "works_rels_terms_id_idx" ON "works_rels" USING btree ("terms_id");
  CREATE INDEX "works_rels_works_id_idx" ON "works_rels" USING btree ("works_id");
  CREATE INDEX "_works_v_version_makers_order_idx" ON "_works_v_version_makers" USING btree ("_order");
  CREATE INDEX "_works_v_version_makers_parent_id_idx" ON "_works_v_version_makers" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_makers_maker_idx" ON "_works_v_version_makers" USING btree ("maker_id");
  CREATE INDEX "_works_v_version_places_order_idx" ON "_works_v_version_places" USING btree ("_order");
  CREATE INDEX "_works_v_version_places_parent_id_idx" ON "_works_v_version_places" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_places_place_idx" ON "_works_v_version_places" USING btree ("place_id");
  CREATE INDEX "_works_v_version_references_order_idx" ON "_works_v_version_references" USING btree ("_order");
  CREATE INDEX "_works_v_version_references_parent_id_idx" ON "_works_v_version_references" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_references_source_idx" ON "_works_v_version_references" USING btree ("source_id");
  CREATE UNIQUE INDEX "_works_v_version_references_locales_locale_parent_id_unique" ON "_works_v_version_references_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_version_provenance_order_idx" ON "_works_v_version_provenance" USING btree ("_order");
  CREATE INDEX "_works_v_version_provenance_parent_id_idx" ON "_works_v_version_provenance" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_works_v_version_provenance_locales_locale_parent_id_unique" ON "_works_v_version_provenance_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_version_condition_defects_order_idx" ON "_works_v_version_condition_defects" USING btree ("_order");
  CREATE INDEX "_works_v_version_condition_defects_parent_id_idx" ON "_works_v_version_condition_defects" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_works_v_version_condition_defects_locales_locale_parent_id_" ON "_works_v_version_condition_defects_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_version_images_order_idx" ON "_works_v_version_images" USING btree ("_order");
  CREATE INDEX "_works_v_version_images_parent_id_idx" ON "_works_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_images_media_idx" ON "_works_v_version_images" USING btree ("media_id");
  CREATE UNIQUE INDEX "_works_v_version_images_locales_locale_parent_id_unique" ON "_works_v_version_images_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_version_cataloguing_ai_draft_order_idx" ON "_works_v_version_cataloguing_ai_draft" USING btree ("order");
  CREATE INDEX "_works_v_version_cataloguing_ai_draft_parent_idx" ON "_works_v_version_cataloguing_ai_draft" USING btree ("parent_id");
  CREATE INDEX "_works_v_parent_idx" ON "_works_v" USING btree ("parent_id");
  CREATE INDEX "_works_v_version_version_work_uid_idx" ON "_works_v" USING btree ("version_work_uid");
  CREATE INDEX "_works_v_version_version_stock_number_idx" ON "_works_v" USING btree ("version_stock_number");
  CREATE INDEX "_works_v_version_version_object_type_idx" ON "_works_v" USING btree ("version_object_type");
  CREATE INDEX "_works_v_version_book_version_book_spine_idx" ON "_works_v" USING btree ("version_book_spine_id");
  CREATE INDEX "_works_v_version_book_version_book_cover_idx" ON "_works_v" USING btree ("version_book_cover_id");
  CREATE INDEX "_works_v_version_condition_version_condition_grade_idx" ON "_works_v" USING btree ("version_condition_grade_id");
  CREATE INDEX "_works_v_version_version_master_idx" ON "_works_v" USING btree ("version_master_id");
  CREATE INDEX "_works_v_version_physical_version_physical_location_idx" ON "_works_v" USING btree ("version_physical_location_id");
  CREATE INDEX "_works_v_version_origin_version_origin_work_uid_idx" ON "_works_v" USING btree ("version_origin_work_uid");
  CREATE INDEX "_works_v_version_cataloguing_version_cataloguing_catalog_idx" ON "_works_v" USING btree ("version_cataloguing_cataloguer_id");
  CREATE INDEX "_works_v_version_legacy_version_legacy_product_id_idx" ON "_works_v" USING btree ("version_legacy_product_id");
  CREATE INDEX "_works_v_version_seo_version_seo_image_idx" ON "_works_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_works_v_version_version_updated_at_idx" ON "_works_v" USING btree ("version_updated_at");
  CREATE INDEX "_works_v_version_version_created_at_idx" ON "_works_v" USING btree ("version_created_at");
  CREATE INDEX "_works_v_version_version__status_idx" ON "_works_v" USING btree ("version__status");
  CREATE INDEX "_works_v_created_at_idx" ON "_works_v" USING btree ("created_at");
  CREATE INDEX "_works_v_updated_at_idx" ON "_works_v" USING btree ("updated_at");
  CREATE INDEX "_works_v_snapshot_idx" ON "_works_v" USING btree ("snapshot");
  CREATE INDEX "_works_v_published_locale_idx" ON "_works_v" USING btree ("published_locale");
  CREATE INDEX "_works_v_latest_idx" ON "_works_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_works_v_locales_locale_parent_id_unique" ON "_works_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_texts_order_parent" ON "_works_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_works_v_rels_order_idx" ON "_works_v_rels" USING btree ("order");
  CREATE INDEX "_works_v_rels_parent_idx" ON "_works_v_rels" USING btree ("parent_id");
  CREATE INDEX "_works_v_rels_path_idx" ON "_works_v_rels" USING btree ("path");
  CREATE INDEX "_works_v_rels_media_id_idx" ON "_works_v_rels" USING btree ("media_id");
  CREATE INDEX "_works_v_rels_terms_id_idx" ON "_works_v_rels" USING btree ("terms_id");
  CREATE INDEX "_works_v_rels_works_id_idx" ON "_works_v_rels" USING btree ("works_id");
  ALTER TABLE "works" ADD CONSTRAINT "works_book_spine_id_media_id_fk" FOREIGN KEY ("book_spine_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_book_cover_id_media_id_fk" FOREIGN KEY ("book_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_condition_grade_id_terms_id_fk" FOREIGN KEY ("condition_grade_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_physical_location_id_locations_id_fk" FOREIGN KEY ("physical_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_cataloguing_cataloguer_id_users_id_fk" FOREIGN KEY ("cataloguing_cataloguer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "works_work_uid_idx" ON "works" USING btree ("work_uid");
  CREATE INDEX "works_stock_number_idx" ON "works" USING btree ("stock_number");
  CREATE INDEX "works_object_type_idx" ON "works" USING btree ("object_type");
  CREATE INDEX "works_book_book_spine_idx" ON "works" USING btree ("book_spine_id");
  CREATE INDEX "works_book_book_cover_idx" ON "works" USING btree ("book_cover_id");
  CREATE INDEX "works_condition_condition_grade_idx" ON "works" USING btree ("condition_grade_id");
  CREATE INDEX "works_master_idx" ON "works" USING btree ("master_id");
  CREATE INDEX "works_physical_physical_location_idx" ON "works" USING btree ("physical_location_id");
  CREATE INDEX "works_origin_origin_work_uid_idx" ON "works" USING btree ("origin_work_uid");
  CREATE INDEX "works_cataloguing_cataloguing_cataloguer_idx" ON "works" USING btree ("cataloguing_cataloguer_id");
  CREATE UNIQUE INDEX "works_legacy_legacy_product_id_idx" ON "works" USING btree ("legacy_product_id");
  CREATE INDEX "works_seo_seo_image_idx" ON "works" USING btree ("seo_image_id");
  CREATE INDEX "works__status_idx" ON "works" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "works_makers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_places" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_references" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_references_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_provenance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_provenance_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_condition_defects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_condition_defects_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_images_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_cataloguing_ai_draft" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_makers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_places" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_references" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_references_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_provenance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_provenance_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_condition_defects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_condition_defects_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_images_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_version_cataloguing_ai_draft" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "works_makers" CASCADE;
  DROP TABLE "works_places" CASCADE;
  DROP TABLE "works_references" CASCADE;
  DROP TABLE "works_references_locales" CASCADE;
  DROP TABLE "works_provenance" CASCADE;
  DROP TABLE "works_provenance_locales" CASCADE;
  DROP TABLE "works_condition_defects" CASCADE;
  DROP TABLE "works_condition_defects_locales" CASCADE;
  DROP TABLE "works_images" CASCADE;
  DROP TABLE "works_images_locales" CASCADE;
  DROP TABLE "works_cataloguing_ai_draft" CASCADE;
  DROP TABLE "works_locales" CASCADE;
  DROP TABLE "works_texts" CASCADE;
  DROP TABLE "works_rels" CASCADE;
  DROP TABLE "_works_v_version_makers" CASCADE;
  DROP TABLE "_works_v_version_places" CASCADE;
  DROP TABLE "_works_v_version_references" CASCADE;
  DROP TABLE "_works_v_version_references_locales" CASCADE;
  DROP TABLE "_works_v_version_provenance" CASCADE;
  DROP TABLE "_works_v_version_provenance_locales" CASCADE;
  DROP TABLE "_works_v_version_condition_defects" CASCADE;
  DROP TABLE "_works_v_version_condition_defects_locales" CASCADE;
  DROP TABLE "_works_v_version_images" CASCADE;
  DROP TABLE "_works_v_version_images_locales" CASCADE;
  DROP TABLE "_works_v_version_cataloguing_ai_draft" CASCADE;
  DROP TABLE "_works_v" CASCADE;
  DROP TABLE "_works_v_locales" CASCADE;
  DROP TABLE "_works_v_texts" CASCADE;
  DROP TABLE "_works_v_rels" CASCADE;
  ALTER TABLE "works" DROP CONSTRAINT "works_book_spine_id_media_id_fk";
  
  ALTER TABLE "works" DROP CONSTRAINT "works_book_cover_id_media_id_fk";
  
  ALTER TABLE "works" DROP CONSTRAINT "works_condition_grade_id_terms_id_fk";
  
  ALTER TABLE "works" DROP CONSTRAINT "works_master_id_masters_id_fk";
  
  ALTER TABLE "works" DROP CONSTRAINT "works_physical_location_id_locations_id_fk";
  
  ALTER TABLE "works" DROP CONSTRAINT "works_cataloguing_cataloguer_id_users_id_fk";
  
  ALTER TABLE "works" DROP CONSTRAINT "works_seo_image_id_media_id_fk";
  
  DROP INDEX "works_work_uid_idx";
  DROP INDEX "works_stock_number_idx";
  DROP INDEX "works_object_type_idx";
  DROP INDEX "works_book_book_spine_idx";
  DROP INDEX "works_book_book_cover_idx";
  DROP INDEX "works_condition_condition_grade_idx";
  DROP INDEX "works_master_idx";
  DROP INDEX "works_physical_physical_location_idx";
  DROP INDEX "works_origin_origin_work_uid_idx";
  DROP INDEX "works_cataloguing_cataloguing_cataloguer_idx";
  DROP INDEX "works_legacy_legacy_product_id_idx";
  DROP INDEX "works_seo_seo_image_idx";
  DROP INDEX "works__status_idx";
  ALTER TABLE "works" DROP COLUMN "work_uid";
  ALTER TABLE "works" DROP COLUMN "stock_number";
  ALTER TABLE "works" DROP COLUMN "original_title";
  ALTER TABLE "works" DROP COLUMN "original_title_language";
  ALTER TABLE "works" DROP COLUMN "object_type";
  ALTER TABLE "works" DROP COLUMN "date_precision";
  ALTER TABLE "works" DROP COLUMN "date_from";
  ALTER TABLE "works" DROP COLUMN "date_to";
  ALTER TABLE "works" DROP COLUMN "first_edition_precision";
  ALTER TABLE "works" DROP COLUMN "first_edition_from";
  ALTER TABLE "works" DROP COLUMN "first_edition_to";
  ALTER TABLE "works" DROP COLUMN "date_on_plate_precision";
  ALTER TABLE "works" DROP COLUMN "date_on_plate_from";
  ALTER TABLE "works" DROP COLUMN "date_on_plate_to";
  ALTER TABLE "works" DROP COLUMN "publication_place";
  ALTER TABLE "works" DROP COLUMN "publication_publisher";
  ALTER TABLE "works" DROP COLUMN "publication_source_work";
  ALTER TABLE "works" DROP COLUMN "publication_edition";
  ALTER TABLE "works" DROP COLUMN "publication_state";
  ALTER TABLE "works" DROP COLUMN "publication_text_language";
  ALTER TABLE "works" DROP COLUMN "technique";
  ALTER TABLE "works" DROP COLUMN "colour";
  ALTER TABLE "works" DROP COLUMN "dimensions_image_height";
  ALTER TABLE "works" DROP COLUMN "dimensions_image_width";
  ALTER TABLE "works" DROP COLUMN "dimensions_sheet_height";
  ALTER TABLE "works" DROP COLUMN "dimensions_sheet_width";
  ALTER TABLE "works" DROP COLUMN "dimensions_framed_height";
  ALTER TABLE "works" DROP COLUMN "dimensions_framed_width";
  ALTER TABLE "works" DROP COLUMN "dimensions_framed_depth";
  ALTER TABLE "works" DROP COLUMN "book_pagination";
  ALTER TABLE "works" DROP COLUMN "book_plates";
  ALTER TABLE "works" DROP COLUMN "book_spine_id";
  ALTER TABLE "works" DROP COLUMN "book_cover_id";
  ALTER TABLE "works" DROP COLUMN "condition_grade_id";
  ALTER TABLE "works" DROP COLUMN "master_id";
  ALTER TABLE "works" DROP COLUMN "physical_location_id";
  ALTER TABLE "works" DROP COLUMN "physical_export_status";
  ALTER TABLE "works" DROP COLUMN "physical_coa_issued";
  ALTER TABLE "works" DROP COLUMN "physical_acquisition_source";
  ALTER TABLE "works" DROP COLUMN "physical_acquisition_consignor";
  ALTER TABLE "works" DROP COLUMN "physical_acquisition_date";
  ALTER TABLE "works" DROP COLUMN "physical_acquisition_cost_amount";
  ALTER TABLE "works" DROP COLUMN "physical_acquisition_cost_currency";
  ALTER TABLE "works" DROP COLUMN "rights_status";
  ALTER TABLE "works" DROP COLUMN "rights_holder";
  ALTER TABLE "works" DROP COLUMN "rights_licence_ref";
  ALTER TABLE "works" DROP COLUMN "rights_expires";
  ALTER TABLE "works" DROP COLUMN "rights_print_allowed";
  ALTER TABLE "works" DROP COLUMN "origin_brand";
  ALTER TABLE "works" DROP COLUMN "origin_work_uid";
  ALTER TABLE "works" DROP COLUMN "origin_synced_at";
  ALTER TABLE "works" DROP COLUMN "cataloguing_status";
  ALTER TABLE "works" DROP COLUMN "cataloguing_cataloguer_id";
  ALTER TABLE "works" DROP COLUMN "cataloguing_verified_at";
  ALTER TABLE "works" DROP COLUMN "legacy_product_id";
  ALTER TABLE "works" DROP COLUMN "legacy_sku";
  ALTER TABLE "works" DROP COLUMN "legacy_url";
  ALTER TABLE "works" DROP COLUMN "seo_image_id";
  ALTER TABLE "works" DROP COLUMN "_status";
  DROP TYPE "public"."enum_works_makers_role";
  DROP TYPE "public"."enum_works_makers_certainty";
  DROP TYPE "public"."enum_works_places_role";
  DROP TYPE "public"."enum_works_cataloguing_ai_draft";
  DROP TYPE "public"."enum_works_object_type";
  DROP TYPE "public"."enum_works_date_precision";
  DROP TYPE "public"."enum_works_first_edition_precision";
  DROP TYPE "public"."enum_works_date_on_plate_precision";
  DROP TYPE "public"."enum_works_technique";
  DROP TYPE "public"."enum_works_colour";
  DROP TYPE "public"."enum_works_physical_export_status";
  DROP TYPE "public"."enum_works_physical_acquisition_cost_currency";
  DROP TYPE "public"."enum_works_rights_status";
  DROP TYPE "public"."enum_works_cataloguing_status";
  DROP TYPE "public"."enum_works_status";
  DROP TYPE "public"."enum_works_translation_status";
  DROP TYPE "public"."enum__works_v_version_makers_role";
  DROP TYPE "public"."enum__works_v_version_makers_certainty";
  DROP TYPE "public"."enum__works_v_version_places_role";
  DROP TYPE "public"."enum__works_v_version_cataloguing_ai_draft";
  DROP TYPE "public"."enum__works_v_version_object_type";
  DROP TYPE "public"."enum__works_v_version_date_precision";
  DROP TYPE "public"."enum__works_v_version_first_edition_precision";
  DROP TYPE "public"."enum__works_v_version_date_on_plate_precision";
  DROP TYPE "public"."enum__works_v_version_technique";
  DROP TYPE "public"."enum__works_v_version_colour";
  DROP TYPE "public"."enum__works_v_version_physical_export_status";
  DROP TYPE "public"."enum__works_v_version_physical_acquisition_cost_currency";
  DROP TYPE "public"."enum__works_v_version_rights_status";
  DROP TYPE "public"."enum__works_v_version_cataloguing_status";
  DROP TYPE "public"."enum__works_v_version_status";
  DROP TYPE "public"."enum__works_v_published_locale";
  DROP TYPE "public"."enum__works_v_version_translation_status";`)
}
