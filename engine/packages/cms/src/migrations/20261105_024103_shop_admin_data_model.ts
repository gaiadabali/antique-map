import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { generateNKeysBetween } from 'payload/shared'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_product_rail_source" AS ENUM('newest', 'category', 'picked');
  CREATE TYPE "public"."enum__pages_v_blocks_product_rail_source" AS ENUM('newest', 'category', 'picked');
  CREATE TYPE "public"."enum_site_settings_gallery_social_network" AS ENUM('instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'x', 'linkedin', 'threads');
  CREATE TYPE "public"."enum_site_settings_shop_social_network" AS ENUM('instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'x', 'linkedin', 'threads');
  CREATE TYPE "public"."enum_shop_navigation_main_menu_target" AS ENUM('page', 'category', 'product', 'url');
  CREATE TYPE "public"."enum_shop_navigation_footer_columns_links_target" AS ENUM('page', 'category', 'product', 'url');
  CREATE TYPE "public"."enum_shop_navigation_announcement_link_target" AS ENUM('page', 'category', 'product', 'url');
  CREATE TABLE "shop_navigation_main_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"target" "enum_shop_navigation_main_menu_target" DEFAULT 'page' NOT NULL,
  	"page_id" integer,
  	"category_id" integer,
  	"product_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "shop_navigation_main_menu_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "shop_navigation_footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"target" "enum_shop_navigation_footer_columns_links_target" DEFAULT 'page' NOT NULL,
  	"page_id" integer,
  	"category_id" integer,
  	"product_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "shop_navigation_footer_columns_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "shop_navigation_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "shop_navigation_footer_columns_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "shop_navigation_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"page_id" integer
  );
  
  CREATE TABLE "shop_navigation_legal_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "shop_navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"announcement_enabled" boolean DEFAULT false,
  	"announcement_link_target" "enum_shop_navigation_announcement_link_target",
  	"announcement_link_page_id" integer,
  	"announcement_link_category_id" integer,
  	"announcement_link_product_id" integer,
  	"announcement_link_url" varchar,
  	"announcement_starts_at" timestamp(3) with time zone,
  	"announcement_ends_at" timestamp(3) with time zone,
  	"logo_light_id" integer,
  	"logo_dark_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "shop_navigation_locales" (
  	"announcement_text" varchar,
  	"copyright" varchar,
  	"gallery_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "categories" ADD COLUMN "_order" varchar;
  ALTER TABLE "_categories_v" ADD COLUMN "version__order" varchar;
  ALTER TABLE "pages_blocks_home_hero" ADD COLUMN "image_id" integer;
  ALTER TABLE "pages_blocks_product_rail" ADD COLUMN "source" "enum_pages_blocks_product_rail_source";
  ALTER TABLE "pages_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "_pages_v_blocks_home_hero" ADD COLUMN "image_id" integer;
  ALTER TABLE "_pages_v_blocks_product_rail" ADD COLUMN "source" "enum__pages_v_blocks_product_rail_source";
  ALTER TABLE "_pages_v_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "site_settings_gallery_social" ADD COLUMN "network" "enum_site_settings_gallery_social_network";
  ALTER TABLE "site_settings_shop_social" ADD COLUMN "network" "enum_site_settings_shop_social_network";
  ALTER TABLE "site_settings" ADD COLUMN "shop_welcome_offer_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "shop_low_stock_threshold" numeric DEFAULT 2;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_order_received_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_order_received_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_awaiting_quote_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_awaiting_quote_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_price_ready_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_price_ready_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_paid_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_paid_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_processing_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_processing_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_waiting_driver_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_waiting_driver_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_on_the_way_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_on_the_way_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_delivered_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_delivered_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_cancelled_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_cancelled_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_expired_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_expired_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_tracking_link_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_tracking_link_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_store_new_order_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_store_new_order_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_store_reassigned_subject" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_emails_store_reassigned_opening" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_signal_first" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_signal_second" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_delivery_line" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_finish_help_label" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_finish_help" varchar;
  ALTER TABLE "shop_navigation_main_menu" ADD CONSTRAINT "shop_navigation_main_menu_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_main_menu" ADD CONSTRAINT "shop_navigation_main_menu_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_main_menu" ADD CONSTRAINT "shop_navigation_main_menu_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_main_menu" ADD CONSTRAINT "shop_navigation_main_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_main_menu_locales" ADD CONSTRAINT "shop_navigation_main_menu_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation_main_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns_links" ADD CONSTRAINT "shop_navigation_footer_columns_links_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns_links" ADD CONSTRAINT "shop_navigation_footer_columns_links_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns_links" ADD CONSTRAINT "shop_navigation_footer_columns_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns_links" ADD CONSTRAINT "shop_navigation_footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns_links_locales" ADD CONSTRAINT "shop_navigation_footer_columns_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation_footer_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns" ADD CONSTRAINT "shop_navigation_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_footer_columns_locales" ADD CONSTRAINT "shop_navigation_footer_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_legal_links" ADD CONSTRAINT "shop_navigation_legal_links_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_legal_links" ADD CONSTRAINT "shop_navigation_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation_legal_links_locales" ADD CONSTRAINT "shop_navigation_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_navigation" ADD CONSTRAINT "shop_navigation_announcement_link_page_id_pages_id_fk" FOREIGN KEY ("announcement_link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation" ADD CONSTRAINT "shop_navigation_announcement_link_category_id_categories_id_fk" FOREIGN KEY ("announcement_link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation" ADD CONSTRAINT "shop_navigation_announcement_link_product_id_products_id_fk" FOREIGN KEY ("announcement_link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation" ADD CONSTRAINT "shop_navigation_logo_light_id_media_id_fk" FOREIGN KEY ("logo_light_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation" ADD CONSTRAINT "shop_navigation_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_navigation_locales" ADD CONSTRAINT "shop_navigation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_navigation"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shop_navigation_main_menu_order_idx" ON "shop_navigation_main_menu" USING btree ("_order");
  CREATE INDEX "shop_navigation_main_menu_parent_id_idx" ON "shop_navigation_main_menu" USING btree ("_parent_id");
  CREATE INDEX "shop_navigation_main_menu_page_idx" ON "shop_navigation_main_menu" USING btree ("page_id");
  CREATE INDEX "shop_navigation_main_menu_category_idx" ON "shop_navigation_main_menu" USING btree ("category_id");
  CREATE INDEX "shop_navigation_main_menu_product_idx" ON "shop_navigation_main_menu" USING btree ("product_id");
  CREATE UNIQUE INDEX "shop_navigation_main_menu_locales_locale_parent_id_unique" ON "shop_navigation_main_menu_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shop_navigation_footer_columns_links_order_idx" ON "shop_navigation_footer_columns_links" USING btree ("_order");
  CREATE INDEX "shop_navigation_footer_columns_links_parent_id_idx" ON "shop_navigation_footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "shop_navigation_footer_columns_links_page_idx" ON "shop_navigation_footer_columns_links" USING btree ("page_id");
  CREATE INDEX "shop_navigation_footer_columns_links_category_idx" ON "shop_navigation_footer_columns_links" USING btree ("category_id");
  CREATE INDEX "shop_navigation_footer_columns_links_product_idx" ON "shop_navigation_footer_columns_links" USING btree ("product_id");
  CREATE UNIQUE INDEX "shop_navigation_footer_columns_links_locales_locale_parent_i" ON "shop_navigation_footer_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shop_navigation_footer_columns_order_idx" ON "shop_navigation_footer_columns" USING btree ("_order");
  CREATE INDEX "shop_navigation_footer_columns_parent_id_idx" ON "shop_navigation_footer_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "shop_navigation_footer_columns_locales_locale_parent_id_uniq" ON "shop_navigation_footer_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shop_navigation_legal_links_order_idx" ON "shop_navigation_legal_links" USING btree ("_order");
  CREATE INDEX "shop_navigation_legal_links_parent_id_idx" ON "shop_navigation_legal_links" USING btree ("_parent_id");
  CREATE INDEX "shop_navigation_legal_links_page_idx" ON "shop_navigation_legal_links" USING btree ("page_id");
  CREATE UNIQUE INDEX "shop_navigation_legal_links_locales_locale_parent_id_unique" ON "shop_navigation_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shop_navigation_announcement_link_announcement_link_page_idx" ON "shop_navigation" USING btree ("announcement_link_page_id");
  CREATE INDEX "shop_navigation_announcement_link_announcement_link_cate_idx" ON "shop_navigation" USING btree ("announcement_link_category_id");
  CREATE INDEX "shop_navigation_announcement_link_announcement_link_prod_idx" ON "shop_navigation" USING btree ("announcement_link_product_id");
  CREATE INDEX "shop_navigation_logo_logo_light_idx" ON "shop_navigation" USING btree ("logo_light_id");
  CREATE INDEX "shop_navigation_logo_logo_dark_idx" ON "shop_navigation" USING btree ("logo_dark_id");
  CREATE UNIQUE INDEX "shop_navigation_locales_locale_parent_id_unique" ON "shop_navigation_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "pages_blocks_home_hero" ADD CONSTRAINT "pages_blocks_home_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_home_hero" ADD CONSTRAINT "_pages_v_blocks_home_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_shop_welcome_offer_id_discounts_id_fk" FOREIGN KEY ("shop_welcome_offer_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories__order_idx" ON "categories" USING btree ("_order");
  CREATE INDEX "_categories_v_version_version__order_idx" ON "_categories_v" USING btree ("version__order");
  CREATE INDEX "pages_blocks_home_hero_image_idx" ON "pages_blocks_home_hero" USING btree ("image_id");
  CREATE INDEX "pages_rels_products_id_idx" ON "pages_rels" USING btree ("products_id");
  CREATE INDEX "_pages_v_blocks_home_hero_image_idx" ON "_pages_v_blocks_home_hero" USING btree ("image_id");
  CREATE INDEX "_pages_v_rels_products_id_idx" ON "_pages_v_rels" USING btree ("products_id");
  CREATE INDEX "site_settings_shop_shop_welcome_offer_idx" ON "site_settings" USING btree ("shop_welcome_offer_id");`)
  await backfill(db)
}

/**
 * Written by hand, after the generated DDL (TASKS.md 27.1.e): what the new columns mean for the
 * rows that predate them, so nothing an owner set changes meaning. Each statement fills only a
 * column still empty, so running it twice changes nothing.
 *
 * - the welcome discount: the `discounts` record the typed code names becomes the pick;
 * - a social link: the network its typed platform name means (the hook does the same on a save);
 * - a products rail: `category` when it names one, else `newest` — what it showed;
 * - the categories: a dragged-order key each, in the order `position` gave them, and the same key
 *   on each of their versions, so publishing an older draft keeps the category's place.
 */
async function backfill(db: MigrateUpArgs['db']): Promise<void> {
  await db.execute(sql`
    UPDATE "site_settings" AS s SET "shop_welcome_offer_id" = d."id"
      FROM "discounts" AS d
     WHERE s."shop_welcome_offer_id" IS NULL
       AND d."code" = upper(trim(s."shop_welcome_discount"))`)
  for (const site of ['gallery', 'shop'] as const) {
    const table = sql.identifier(`site_settings_${site}_social`)
    const type = sql.identifier(`enum_site_settings_${site}_social_network`)
    await db.execute(sql`
      WITH named AS (
        SELECT "id",
               CASE lower(regexp_replace("platform", '[[:space:]]', '', 'g'))
                 WHEN 'twitter' THEN 'x'
                 ELSE lower(regexp_replace("platform", '[[:space:]]', '', 'g'))
               END AS network
          FROM ${table}
         WHERE "network" IS NULL)
      UPDATE ${table} AS t SET "network" = named.network::${type}
        FROM named
       WHERE t."id" = named."id"
         AND named.network IN ('instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'x',
                               'linkedin', 'threads')`)
  }
  for (const [table, type] of [
    ['pages_blocks_product_rail', 'enum_pages_blocks_product_rail_source'],
    ['_pages_v_blocks_product_rail', 'enum__pages_v_blocks_product_rail_source'],
  ] as const) {
    await db.execute(sql`
      UPDATE ${sql.identifier(table)}
         SET "source" = (CASE WHEN "category_id" IS NULL THEN 'newest' ELSE 'category' END)::${sql.identifier(type)}
       WHERE "source" IS NULL`)
  }
  const unordered = (await db.execute(sql`
    SELECT "id" FROM "categories" WHERE "_order" IS NULL
     ORDER BY "position" ASC NULLS LAST, "id" ASC`)) as unknown as { rows: { id: number }[] }
  const last = (await db.execute(sql`
    SELECT max("_order") AS "key" FROM "categories"`)) as unknown as {
    rows: { key: string | null }[]
  }
  const keys = generateNKeysBetween(last.rows[0]?.key ?? null, null, unordered.rows.length)
  for (const [index, { id }] of unordered.rows.entries()) {
    await db.execute(sql`UPDATE "categories" SET "_order" = ${keys[index]} WHERE "id" = ${id}`)
  }
  await db.execute(sql`
    UPDATE "_categories_v" AS v SET "version__order" = c."_order"
      FROM "categories" AS c
     WHERE v."parent_id" = c."id" AND v."version__order" IS NULL`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shop_navigation_main_menu" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_main_menu_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_footer_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_footer_columns_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_footer_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_footer_columns_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_legal_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_legal_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_navigation_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "shop_navigation_main_menu" CASCADE;
  DROP TABLE "shop_navigation_main_menu_locales" CASCADE;
  DROP TABLE "shop_navigation_footer_columns_links" CASCADE;
  DROP TABLE "shop_navigation_footer_columns_links_locales" CASCADE;
  DROP TABLE "shop_navigation_footer_columns" CASCADE;
  DROP TABLE "shop_navigation_footer_columns_locales" CASCADE;
  DROP TABLE "shop_navigation_legal_links" CASCADE;
  DROP TABLE "shop_navigation_legal_links_locales" CASCADE;
  DROP TABLE "shop_navigation" CASCADE;
  DROP TABLE "shop_navigation_locales" CASCADE;
  ALTER TABLE "pages_blocks_home_hero" DROP CONSTRAINT "pages_blocks_home_hero_image_id_media_id_fk";
  
  ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_products_fk";
  
  ALTER TABLE "_pages_v_blocks_home_hero" DROP CONSTRAINT "_pages_v_blocks_home_hero_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_products_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_shop_welcome_offer_id_discounts_id_fk";
  
  DROP INDEX "categories__order_idx";
  DROP INDEX "_categories_v_version_version__order_idx";
  DROP INDEX "pages_blocks_home_hero_image_idx";
  DROP INDEX "pages_rels_products_id_idx";
  DROP INDEX "_pages_v_blocks_home_hero_image_idx";
  DROP INDEX "_pages_v_rels_products_id_idx";
  DROP INDEX "site_settings_shop_shop_welcome_offer_idx";
  ALTER TABLE "categories" DROP COLUMN "_order";
  ALTER TABLE "_categories_v" DROP COLUMN "version__order";
  ALTER TABLE "pages_blocks_home_hero" DROP COLUMN "image_id";
  ALTER TABLE "pages_blocks_product_rail" DROP COLUMN "source";
  ALTER TABLE "pages_rels" DROP COLUMN "products_id";
  ALTER TABLE "_pages_v_blocks_home_hero" DROP COLUMN "image_id";
  ALTER TABLE "_pages_v_blocks_product_rail" DROP COLUMN "source";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "products_id";
  ALTER TABLE "site_settings_gallery_social" DROP COLUMN "network";
  ALTER TABLE "site_settings_shop_social" DROP COLUMN "network";
  ALTER TABLE "site_settings" DROP COLUMN "shop_welcome_offer_id";
  ALTER TABLE "site_settings" DROP COLUMN "shop_low_stock_threshold";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_order_received_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_order_received_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_awaiting_quote_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_awaiting_quote_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_price_ready_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_price_ready_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_paid_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_paid_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_processing_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_processing_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_waiting_driver_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_waiting_driver_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_on_the_way_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_on_the_way_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_delivered_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_delivered_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_cancelled_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_cancelled_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_expired_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_expired_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_tracking_link_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_tracking_link_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_store_new_order_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_store_new_order_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_store_reassigned_subject";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_emails_store_reassigned_opening";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_signal_first";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_signal_second";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_delivery_line";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_finish_help_label";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_finish_help";
  DROP TYPE "public"."enum_pages_blocks_product_rail_source";
  DROP TYPE "public"."enum__pages_v_blocks_product_rail_source";
  DROP TYPE "public"."enum_site_settings_gallery_social_network";
  DROP TYPE "public"."enum_site_settings_shop_social_network";
  DROP TYPE "public"."enum_shop_navigation_main_menu_target";
  DROP TYPE "public"."enum_shop_navigation_footer_columns_links_target";
  DROP TYPE "public"."enum_shop_navigation_announcement_link_target";`)
}
