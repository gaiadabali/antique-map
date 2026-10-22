import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * TASKS.md 2.5 — the one initial migration. The four before it (the brand-era initial, wave_a,
 * works and 2.4's interim w2_cms) were deleted, and every database they migrated was dropped
 * after a `pg_dump`, not migrated forward: their `payload_migrations` rows name files that no
 * longer exist (CARRY-OVER.md §3 step 7, §6.4).
 *
 * Generated once by `migrate:create initial` on a clean branch, from the nine collections 2.4
 * left; then three hand-written steps (marked below), which drizzle-kit does not manage:
 * 1. `unaccent` and `pg_trgm`, before any table.
 * 2. **The last-owner backstop** (senior-db reviews of 3.2, B1 and R1, and of 2.4): a constraint
 *    trigger on `users` under `ADMINS_LOCK_KEY` refuses any statement that leaves users and no
 *    owner — by an insert, a demotion or a delete.
 * 3. **The truncate refusals** (R2) on `users` and on `stores`.
 *
 * What the 2.4 review changed from w2_cms's form of step 2:
 * - **Immediate, not deferred.** Payload's `commitTransaction` swallows a failed COMMIT
 *   (`@payloadcms/drizzle` `beginTransaction`'s `.catch`), so a refusal at COMMIT answered the
 *   caller with success and saved nothing. Checked at the end of each statement, the refusal
 *   reaches the caller; a one-statement swap of two owners still passes.
 * - **INSERT is judged too**: a non-owner inserted into an empty `users` left users and no owner.
 * - **READ COMMITTED only.** The lock serialises two writers only if the second, once it holds
 *   the lock, sees the first's commit; at REPEATABLE READ or SERIALIZABLE its snapshot predates
 *   it. The boot probe holds the server's default to READ COMMITTED (`db/probe.ts`); a raw session
 *   that raises its own level is refused rather than let through unserialised.
 * - **`search_path` pinned** on every hand-written function, so no object named `users` earlier
 *   on a caller's path can stand in for the table.
 *
 * Not carried over from w2_cms, because a migration that builds from nothing has nothing to
 * carry: its refusals of data it would lose (room plates, print files, sister copies, `nl` text),
 * its role carry-over from `users_roles` (`admin` → `owner`, else `editor`), and its nullable-then-
 * `NOT NULL` dance for `users.role`. Nor the old `users_roles` trigger, whose table is gone.
 *
 * A dev-pushed database lacks steps 2 and 3 by design (triggers are not drizzle schema), so
 * `admins.db.test.ts` and `db/owner-backstop.db.test.ts` test them on a migrated database.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  // Hand-written, step 1: the gazetteer and search need unaccent and pg_trgm (ARCHITECTURE.md
  // §8), and drizzle-kit does not manage extensions. Both are trusted extensions, so the
  // database's owning role creates them without a superuser; `IF NOT EXISTS` because a database
  // made by `db:fresh` inherits both from template1.
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;
  `)
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_users_role" AS ENUM('owner', 'editor', 'store');
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
  CREATE TYPE "public"."enum__works_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum__works_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_makers_roles" AS ENUM('cartographer', 'engraver', 'publisher', 'author', 'artist', 'photographer', 'studio', 'printer');
  CREATE TYPE "public"."enum_makers_born_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_makers_died_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum_makers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_makers_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__makers_v_version_roles" AS ENUM('cartographer', 'engraver', 'publisher', 'author', 'artist', 'photographer', 'studio', 'printer');
  CREATE TYPE "public"."enum__makers_v_version_born_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__makers_v_version_died_precision" AS ENUM('exact', 'circa', 'before', 'after', 'range', 'unknown');
  CREATE TYPE "public"."enum__makers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__makers_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum__makers_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_places_type" AS ENUM('region', 'country', 'island-group', 'island', 'province', 'kingdom', 'city', 'town', 'sea', 'strait', 'ocean');
  CREATE TYPE "public"."enum_places_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_places_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__places_v_version_type" AS ENUM('region', 'country', 'island-group', 'island', 'province', 'kingdom', 'city', 'town', 'sea', 'strait', 'ocean');
  CREATE TYPE "public"."enum__places_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__places_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum__places_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_terms_kind" AS ENUM('subject', 'mood', 'room', 'occasion', 'recipient', 'grade');
  CREATE TYPE "public"."enum_terms_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_terms_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum__terms_v_version_kind" AS ENUM('subject', 'mood', 'room', 'occasion', 'recipient', 'grade');
  CREATE TYPE "public"."enum__terms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__terms_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum__terms_v_version_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_media_role" AS ENUM('recto', 'verso', 'detail', 'raking', 'transmitted', 'framed', 'in-room', 'scale', 'flat', 'lifestyle', 'packaging', 'showroom', 'editorial');
  CREATE TYPE "public"."enum_media_provenance" AS ENUM('photograph', 'composite', 'rendered', 'ai-generated');
  CREATE TYPE "public"."enum_media_derivatives_status" AS ENUM('pending', 'ready', 'failed');
  CREATE TYPE "public"."enum_media_iiif_status" AS ENUM('none', 'pending', 'ready', 'failed');
  CREATE TYPE "public"."enum_media_alt_source" AS ENUM('baseline', 'cataloguer', 'ai-draft');
  CREATE TYPE "public"."enum_media_translation_status" AS ENUM('entered', 'machine', 'reviewed');
  CREATE TYPE "public"."enum_masters_kind" AS ENUM('capture');
  CREATE TYPE "public"."enum_masters_role" AS ENUM('recto', 'verso', 'detail', 'raking', 'transmitted', 'framed', 'in-room', 'scale', 'flat', 'lifestyle', 'packaging', 'showroom', 'editorial', 'reference');
  CREATE TYPE "public"."enum_masters_provenance" AS ENUM('photograph', 'composite', 'rendered', 'ai-generated');
  CREATE TYPE "public"."enum_masters_capture_tier" AS ENUM('good', 'better', 'best');
  CREATE TYPE "public"."enum_masters_intake_verdict" AS ENUM('pass', 'fix-owner', 'legacy');
  CREATE TYPE "public"."enum_masters_intake_retouching" AS ENUM('none', 'unknown', 'retouched-legacy');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" NOT NULL,
  	"store_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "stores" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  
  CREATE TABLE "works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"work_uid" varchar,
  	"stock_number" varchar,
  	"original_title" varchar,
  	"original_title_language" varchar,
  	"object_type" "enum_works_object_type",
  	"date_precision" "enum_works_date_precision",
  	"date_from" numeric,
  	"date_to" numeric,
  	"first_edition_precision" "enum_works_first_edition_precision",
  	"first_edition_from" numeric,
  	"first_edition_to" numeric,
  	"date_on_plate_precision" "enum_works_date_on_plate_precision",
  	"date_on_plate_from" numeric,
  	"date_on_plate_to" numeric,
  	"publication_place" varchar,
  	"publication_publisher" varchar,
  	"publication_source_work" varchar,
  	"publication_edition" varchar,
  	"publication_state" varchar,
  	"publication_text_language" varchar,
  	"technique" "enum_works_technique",
  	"colour" "enum_works_colour",
  	"dimensions_image_height" numeric,
  	"dimensions_image_width" numeric,
  	"dimensions_sheet_height" numeric,
  	"dimensions_sheet_width" numeric,
  	"dimensions_framed_height" numeric,
  	"dimensions_framed_width" numeric,
  	"dimensions_framed_depth" numeric,
  	"book_pagination" varchar,
  	"book_plates" varchar,
  	"book_spine_id" integer,
  	"book_cover_id" integer,
  	"condition_grade_id" integer,
  	"master_id" integer,
  	"physical_export_status" "enum_works_physical_export_status",
  	"physical_coa_issued" boolean,
  	"physical_acquisition_source" varchar,
  	"physical_acquisition_consignor" varchar,
  	"physical_acquisition_date" timestamp(3) with time zone,
  	"physical_acquisition_cost_amount" numeric,
  	"physical_acquisition_cost_currency" "enum_works_physical_acquisition_cost_currency",
  	"rights_status" "enum_works_rights_status",
  	"rights_holder" varchar,
  	"rights_licence_ref" varchar,
  	"rights_expires" timestamp(3) with time zone,
  	"rights_print_allowed" boolean DEFAULT false,
  	"cataloguing_status" "enum_works_cataloguing_status" DEFAULT 'draft',
  	"cataloguing_cataloguer_id" integer,
  	"cataloguing_verified_at" timestamp(3) with time zone,
  	"legacy_product_id" numeric,
  	"legacy_sku" varchar,
  	"legacy_url" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_works_status" DEFAULT 'draft'
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
  
  CREATE TABLE "makers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"sort_name" varchar,
  	"slug" varchar,
  	"born_precision" "enum_makers_born_precision" DEFAULT 'unknown',
  	"born_from" numeric,
  	"born_to" numeric,
  	"died_precision" "enum_makers_died_precision" DEFAULT 'unknown',
  	"died_from" numeric,
  	"died_to" numeric,
  	"portrait_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_makers_status" DEFAULT 'draft'
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
  
  CREATE TABLE "places" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"type" "enum_places_type",
  	"parent_id" integer,
  	"geo_lat" numeric,
  	"geo_lng" numeric,
  	"geo_bbox_west" numeric,
  	"geo_bbox_south" numeric,
  	"geo_bbox_east" numeric,
  	"geo_bbox_north" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_places_status" DEFAULT 'draft'
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
  
  CREATE TABLE "terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_terms_kind",
  	"slug" varchar,
  	"equivalent" varchar,
  	"position" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_terms_status" DEFAULT 'draft'
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
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"short_cite" varchar,
  	"slug" varchar,
  	"citation" varchar,
  	"year" numeric,
  	"url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_sources_status" DEFAULT 'draft'
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
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"licence" varchar,
  	"role" "enum_media_role" NOT NULL,
  	"provenance" "enum_media_provenance" NOT NULL,
  	"master_id" integer,
  	"asset_id" varchar,
  	"derivatives_status" "enum_media_derivatives_status" DEFAULT 'pending',
  	"derivatives_version" varchar,
  	"derivatives_blur_data_uri" varchar,
  	"iiif_status" "enum_media_iiif_status" DEFAULT 'none',
  	"prefix" varchar DEFAULT 'uploads',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
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
  
  CREATE TABLE "masters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_masters_kind" NOT NULL,
  	"storage_key" varchar NOT NULL,
  	"checksum" varchar NOT NULL,
  	"byte_size" numeric,
  	"content_type" varchar,
  	"width_px" numeric,
  	"height_px" numeric,
  	"colour_profile" varchar,
  	"work_id" integer,
  	"role" "enum_masters_role",
  	"provenance" "enum_masters_provenance",
  	"object_box_x" numeric,
  	"object_box_y" numeric,
  	"object_box_width" numeric,
  	"object_box_height" numeric,
  	"object_ppi" numeric,
  	"capture_tier" "enum_masters_capture_tier",
  	"intake_batch" varchar,
  	"intake_reference" varchar,
  	"intake_received_as" varchar,
  	"intake_verdict" "enum_masters_intake_verdict",
  	"intake_retouching" "enum_masters_intake_retouching",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"stores_id" integer,
  	"works_id" integer,
  	"makers_id" integer,
  	"places_id" integer,
  	"terms_id" integer,
  	"sources_id" integer,
  	"media_id" integer,
  	"masters_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;
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
  ALTER TABLE "works" ADD CONSTRAINT "works_book_spine_id_media_id_fk" FOREIGN KEY ("book_spine_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_book_cover_id_media_id_fk" FOREIGN KEY ("book_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_condition_grade_id_terms_id_fk" FOREIGN KEY ("condition_grade_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_cataloguing_cataloguer_id_users_id_fk" FOREIGN KEY ("cataloguing_cataloguer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
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
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_cataloguing_cataloguer_id_users_id_fk" FOREIGN KEY ("version_cataloguing_cataloguer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_locales" ADD CONSTRAINT "_works_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_texts" ADD CONSTRAINT "_works_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_terms_fk" FOREIGN KEY ("terms_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers_aliases" ADD CONSTRAINT "makers_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers_roles" ADD CONSTRAINT "makers_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers_same_as" ADD CONSTRAINT "makers_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "makers" ADD CONSTRAINT "makers_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "makers_locales" ADD CONSTRAINT "makers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v_version_aliases" ADD CONSTRAINT "_makers_v_version_aliases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v_version_roles" ADD CONSTRAINT "_makers_v_version_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v_version_same_as" ADD CONSTRAINT "_makers_v_version_same_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_makers_v" ADD CONSTRAINT "_makers_v_parent_id_makers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."makers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_makers_v" ADD CONSTRAINT "_makers_v_version_portrait_id_media_id_fk" FOREIGN KEY ("version_portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_makers_v_locales" ADD CONSTRAINT "_makers_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_makers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_historical_names" ADD CONSTRAINT "places_historical_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places" ADD CONSTRAINT "places_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "places_locales" ADD CONSTRAINT "places_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_version_historical_names" ADD CONSTRAINT "_places_v_version_historical_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_version_parent_id_places_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v_locales" ADD CONSTRAINT "_places_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "terms_locales" ADD CONSTRAINT "terms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_terms_v" ADD CONSTRAINT "_terms_v_parent_id_terms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_terms_v_locales" ADD CONSTRAINT "_terms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "masters_intake_notes" ADD CONSTRAINT "masters_intake_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "masters" ADD CONSTRAINT "masters_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stores_fk" FOREIGN KEY ("stores_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_makers_fk" FOREIGN KEY ("makers_id") REFERENCES "public"."makers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_terms_fk" FOREIGN KEY ("terms_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_masters_fk" FOREIGN KEY ("masters_id") REFERENCES "public"."masters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
  CREATE INDEX "users_store_idx" ON "users" USING btree ("store_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "stores_code_idx" ON "stores" USING btree ("code");
  CREATE INDEX "stores_updated_at_idx" ON "stores" USING btree ("updated_at");
  CREATE INDEX "stores_created_at_idx" ON "stores" USING btree ("created_at");
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
  CREATE UNIQUE INDEX "works_work_uid_idx" ON "works" USING btree ("work_uid");
  CREATE INDEX "works_stock_number_idx" ON "works" USING btree ("stock_number");
  CREATE INDEX "works_object_type_idx" ON "works" USING btree ("object_type");
  CREATE INDEX "works_book_book_spine_idx" ON "works" USING btree ("book_spine_id");
  CREATE INDEX "works_book_book_cover_idx" ON "works" USING btree ("book_cover_id");
  CREATE INDEX "works_condition_condition_grade_idx" ON "works" USING btree ("condition_grade_id");
  CREATE INDEX "works_master_idx" ON "works" USING btree ("master_id");
  CREATE INDEX "works_cataloguing_cataloguing_cataloguer_idx" ON "works" USING btree ("cataloguing_cataloguer_id");
  CREATE UNIQUE INDEX "works_legacy_legacy_product_id_idx" ON "works" USING btree ("legacy_product_id");
  CREATE INDEX "works_seo_seo_image_idx" ON "works" USING btree ("seo_image_id");
  CREATE INDEX "works_updated_at_idx" ON "works" USING btree ("updated_at");
  CREATE INDEX "works_created_at_idx" ON "works" USING btree ("created_at");
  CREATE INDEX "works__status_idx" ON "works" USING btree ("_status");
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
  CREATE INDEX "makers_aliases_order_idx" ON "makers_aliases" USING btree ("_order");
  CREATE INDEX "makers_aliases_parent_id_idx" ON "makers_aliases" USING btree ("_parent_id");
  CREATE INDEX "makers_roles_order_idx" ON "makers_roles" USING btree ("order");
  CREATE INDEX "makers_roles_parent_idx" ON "makers_roles" USING btree ("parent_id");
  CREATE INDEX "makers_same_as_order_idx" ON "makers_same_as" USING btree ("_order");
  CREATE INDEX "makers_same_as_parent_id_idx" ON "makers_same_as" USING btree ("_parent_id");
  CREATE INDEX "makers_sort_name_idx" ON "makers" USING btree ("sort_name");
  CREATE UNIQUE INDEX "makers_slug_idx" ON "makers" USING btree ("slug");
  CREATE INDEX "makers_portrait_idx" ON "makers" USING btree ("portrait_id");
  CREATE INDEX "makers_updated_at_idx" ON "makers" USING btree ("updated_at");
  CREATE INDEX "makers_created_at_idx" ON "makers" USING btree ("created_at");
  CREATE INDEX "makers__status_idx" ON "makers" USING btree ("_status");
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
  CREATE UNIQUE INDEX "places_slug_idx" ON "places" USING btree ("slug");
  CREATE INDEX "places_parent_idx" ON "places" USING btree ("parent_id");
  CREATE INDEX "places_updated_at_idx" ON "places" USING btree ("updated_at");
  CREATE INDEX "places_created_at_idx" ON "places" USING btree ("created_at");
  CREATE INDEX "places__status_idx" ON "places" USING btree ("_status");
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
  CREATE INDEX "terms_kind_idx" ON "terms" USING btree ("kind");
  CREATE INDEX "terms_slug_idx" ON "terms" USING btree ("slug");
  CREATE INDEX "terms_position_idx" ON "terms" USING btree ("position");
  CREATE INDEX "terms_updated_at_idx" ON "terms" USING btree ("updated_at");
  CREATE INDEX "terms_created_at_idx" ON "terms" USING btree ("created_at");
  CREATE INDEX "terms__status_idx" ON "terms" USING btree ("_status");
  CREATE UNIQUE INDEX "kind_slug_idx" ON "terms" USING btree ("kind","slug");
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
  CREATE INDEX "sources_short_cite_idx" ON "sources" USING btree ("short_cite");
  CREATE UNIQUE INDEX "sources_slug_idx" ON "sources" USING btree ("slug");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "sources__status_idx" ON "sources" USING btree ("_status");
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
  CREATE INDEX "media_master_idx" ON "media" USING btree ("master_id");
  CREATE INDEX "media_asset_id_idx" ON "media" USING btree ("asset_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "masters_intake_notes_order_idx" ON "masters_intake_notes" USING btree ("_order");
  CREATE INDEX "masters_intake_notes_parent_id_idx" ON "masters_intake_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "masters_storage_key_idx" ON "masters" USING btree ("storage_key");
  CREATE UNIQUE INDEX "masters_checksum_idx" ON "masters" USING btree ("checksum");
  CREATE INDEX "masters_work_idx" ON "masters" USING btree ("work_id");
  CREATE INDEX "masters_updated_at_idx" ON "masters" USING btree ("updated_at");
  CREATE INDEX "masters_created_at_idx" ON "masters" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_stores_id_idx" ON "payload_locked_documents_rels" USING btree ("stores_id");
  CREATE INDEX "payload_locked_documents_rels_works_id_idx" ON "payload_locked_documents_rels" USING btree ("works_id");
  CREATE INDEX "payload_locked_documents_rels_makers_id_idx" ON "payload_locked_documents_rels" USING btree ("makers_id");
  CREATE INDEX "payload_locked_documents_rels_places_id_idx" ON "payload_locked_documents_rels" USING btree ("places_id");
  CREATE INDEX "payload_locked_documents_rels_terms_id_idx" ON "payload_locked_documents_rels" USING btree ("terms_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_masters_id_idx" ON "payload_locked_documents_rels" USING btree ("masters_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)

  // Hand-written, step 2: the database refuses any statement that leaves users and no owner — the
  // backstop for a path the users hooks never see (raw SQL, an adapter write, two demotions
  // racing). It takes the hooks' own advisory lock first (ADMINS_LOCK_KEY,
  // collections/users/guards.ts), so two writers are judged one after the other and the second,
  // at READ COMMITTED, sees the first's commit. It fires only on a change that can lose the last
  // owner: an owner's role really changing, an owner deleted, a non-owner inserted (into an empty
  // table) — never on a sign-in that updates the row's lockout counters. The hooks take the lock
  // before the row lock on every save of an owner's role and on every create, so two writers
  // never wait on each other in opposite orders (R1).
  //
  // INITIALLY IMMEDIATE: checked at the end of each statement, so the refusal reaches the caller
  // (Payload swallows a failed COMMIT), and one statement may still swap two owners. DEFERRABLE,
  // so a hand-run script can move ownership over several statements with `SET CONSTRAINTS
  // users_keep_an_owner_on_update DEFERRED` and be judged at COMMIT, under the same lock.
  await db.execute(sql`
    CREATE FUNCTION "public"."users_keep_an_owner"() RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = pg_catalog, public
      AS $keep_an_owner$
    BEGIN
      IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'a change to the owners must run at READ COMMITTED, not %',
          upper(current_setting('transaction_isolation'))
          USING ERRCODE = 'invalid_transaction_state';
      END IF;
      PERFORM pg_catalog.pg_advisory_xact_lock(-9011197146015594413);
      IF EXISTS (SELECT 1 FROM "public"."users")
        AND NOT EXISTS (SELECT 1 FROM "public"."users" WHERE "role" = 'owner') THEN
        IF TG_OP = 'INSERT' THEN
          RAISE EXCEPTION 'the first user must be an owner, so someone can still manage staff'
            USING ERRCODE = 'check_violation';
        END IF;
        RAISE EXCEPTION 'the last owner cannot lose the owner role or be deleted'
          USING ERRCODE = 'check_violation';
      END IF;
      RETURN NULL;
    END
    $keep_an_owner$;
    CREATE CONSTRAINT TRIGGER "users_keep_an_owner_on_insert"
      AFTER INSERT ON "public"."users"
      DEFERRABLE INITIALLY IMMEDIATE
      FOR EACH ROW
      WHEN (NEW."role" IS DISTINCT FROM 'owner')
      EXECUTE FUNCTION "public"."users_keep_an_owner"();
    CREATE CONSTRAINT TRIGGER "users_keep_an_owner_on_update"
      AFTER UPDATE OF "role" ON "public"."users"
      DEFERRABLE INITIALLY IMMEDIATE
      FOR EACH ROW
      WHEN (OLD."role" = 'owner' AND NEW."role" IS DISTINCT FROM 'owner')
      EXECUTE FUNCTION "public"."users_keep_an_owner"();
    CREATE CONSTRAINT TRIGGER "users_keep_an_owner_on_delete"
      AFTER DELETE ON "public"."users"
      DEFERRABLE INITIALLY IMMEDIATE
      FOR EACH ROW
      WHEN (OLD."role" = 'owner')
      EXECUTE FUNCTION "public"."users_keep_an_owner"();
  `)

  // Hand-written, step 3 (R2): TRUNCATE fires no row trigger, so it would empty users past the
  // one above. A statement-level trigger refuses it outright on `users`, and on `stores`, whose
  // staff a `TRUNCATE stores CASCADE` would take with it — refused on its own, so the guard does
  // not hang on the foreign key that today makes the cascade reach `users`. Staff and stores are
  // removed with DELETE, which the hooks and the trigger judge.
  await db.execute(sql`
    CREATE FUNCTION "public"."users_refuse_truncate"() RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = pg_catalog, public
      AS $refuse$
    BEGIN
      RAISE EXCEPTION '% is never truncated: delete staff so the last owner stays one',
        TG_TABLE_NAME
        USING ERRCODE = 'check_violation';
    END
    $refuse$;
    CREATE TRIGGER "users_no_truncate"
      BEFORE TRUNCATE ON "public"."users"
      FOR EACH STATEMENT
      EXECUTE FUNCTION "public"."users_refuse_truncate"();
    CREATE TRIGGER "stores_no_truncate"
      BEFORE TRUNCATE ON "public"."stores"
      FOR EACH STATEMENT
      EXECUTE FUNCTION "public"."users_refuse_truncate"();
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Hand-written: the backstop's functions first (CASCADE drops their triggers); the extensions
  // stay, since a database may have had them before this migration (template1).
  await db.execute(sql`
    DROP FUNCTION IF EXISTS "public"."users_keep_an_owner"() CASCADE;
    DROP FUNCTION IF EXISTS "public"."users_refuse_truncate"() CASCADE;
  `)
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "stores" CASCADE;
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
  DROP TABLE "works" CASCADE;
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
  DROP TABLE "makers_aliases" CASCADE;
  DROP TABLE "makers_roles" CASCADE;
  DROP TABLE "makers_same_as" CASCADE;
  DROP TABLE "makers" CASCADE;
  DROP TABLE "makers_locales" CASCADE;
  DROP TABLE "_makers_v_version_aliases" CASCADE;
  DROP TABLE "_makers_v_version_roles" CASCADE;
  DROP TABLE "_makers_v_version_same_as" CASCADE;
  DROP TABLE "_makers_v" CASCADE;
  DROP TABLE "_makers_v_locales" CASCADE;
  DROP TABLE "places_historical_names" CASCADE;
  DROP TABLE "places" CASCADE;
  DROP TABLE "places_locales" CASCADE;
  DROP TABLE "_places_v_version_historical_names" CASCADE;
  DROP TABLE "_places_v" CASCADE;
  DROP TABLE "_places_v_locales" CASCADE;
  DROP TABLE "terms" CASCADE;
  DROP TABLE "terms_locales" CASCADE;
  DROP TABLE "_terms_v" CASCADE;
  DROP TABLE "_terms_v_locales" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "masters_intake_notes" CASCADE;
  DROP TABLE "masters" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
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
  DROP TYPE "public"."enum__works_v_version_translation_status";
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
