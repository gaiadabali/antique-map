import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_home_hero_primary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_home_hero_secondary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_story_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_page_hero_primary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_page_hero_secondary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_offer_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_image_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_pages_blocks_image_text_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_home_hero_primary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_home_hero_secondary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_story_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_page_hero_primary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_page_hero_secondary_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_offer_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_image_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__pages_v_blocks_image_text_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_link_to" AS ENUM('home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking', 'anchor', 'url');
  CREATE TABLE "pages_blocks_home_hero_signals" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_home_hero_signals_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_home_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_link_to" "enum_pages_blocks_home_hero_primary_link_to" DEFAULT 'browse',
  	"primary_link_anchor" varchar,
  	"primary_link_url" varchar,
  	"secondary_link_to" "enum_pages_blocks_home_hero_secondary_link_to" DEFAULT 'browse',
  	"secondary_link_anchor" varchar,
  	"secondary_link_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_home_hero_locales" (
  	"title" varchar,
  	"lede" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_category_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_category_rail_locales" (
  	"title" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_product_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_product_rail_locales" (
  	"title" varchar,
  	"link_label" varchar,
  	"empty_title" varchar,
  	"empty_body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_steps_steps_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'process',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_steps_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_story_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_story_facts_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_story" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_to" "enum_pages_blocks_story_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_story_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_originals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_originals_locales" (
  	"label" varchar,
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_page_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_link_to" "enum_pages_blocks_page_hero_primary_link_to" DEFAULT 'browse',
  	"primary_link_anchor" varchar,
  	"primary_link_url" varchar,
  	"secondary_link_to" "enum_pages_blocks_page_hero_secondary_link_to" DEFAULT 'browse',
  	"secondary_link_anchor" varchar,
  	"secondary_link_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_page_hero_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"lede" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_fact_strip_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_fact_strip_facts_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_fact_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_offer_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_offer_terms_locales" (
  	"label" varchar,
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_to" "enum_pages_blocks_offer_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"warm" boolean DEFAULT false,
  	"anchor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_offer_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_enquiry" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'enquire',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_enquiry_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"talk_first" varchar,
  	"whatsapp_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_partner_sign_in" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_partner_sign_in_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_text_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"side" "enum_pages_blocks_image_text_side" DEFAULT 'left',
  	"link_to" "enum_pages_blocks_image_text_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"anchor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_to" "enum_pages_blocks_call_to_action_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action_locales" (
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_store_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_store_directory_locales" (
  	"title" varchar,
  	"lede" varchar,
  	"empty" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_home_hero_signals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_home_hero_signals_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_home_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_link_to" "enum__pages_v_blocks_home_hero_primary_link_to" DEFAULT 'browse',
  	"primary_link_anchor" varchar,
  	"primary_link_url" varchar,
  	"secondary_link_to" "enum__pages_v_blocks_home_hero_secondary_link_to" DEFAULT 'browse',
  	"secondary_link_anchor" varchar,
  	"secondary_link_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_home_hero_locales" (
  	"title" varchar,
  	"lede" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_category_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_category_rail_locales" (
  	"title" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_product_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_rail_locales" (
  	"title" varchar,
  	"link_label" varchar,
  	"empty_title" varchar,
  	"empty_body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_steps_steps_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'process',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_steps_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_story_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_story_facts_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_story" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_to" "enum__pages_v_blocks_story_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_story_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_originals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_originals_locales" (
  	"label" varchar,
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_page_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_link_to" "enum__pages_v_blocks_page_hero_primary_link_to" DEFAULT 'browse',
  	"primary_link_anchor" varchar,
  	"primary_link_url" varchar,
  	"secondary_link_to" "enum__pages_v_blocks_page_hero_secondary_link_to" DEFAULT 'browse',
  	"secondary_link_anchor" varchar,
  	"secondary_link_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_page_hero_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"lede" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_fact_strip_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_fact_strip_facts_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_fact_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_offer_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_offer_terms_locales" (
  	"label" varchar,
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_to" "enum__pages_v_blocks_offer_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"warm" boolean DEFAULT false,
  	"anchor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_offer_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_enquiry" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'enquire',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_enquiry_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"talk_first" varchar,
  	"whatsapp_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_partner_sign_in" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_partner_sign_in_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_text_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"side" "enum__pages_v_blocks_image_text_side" DEFAULT 'left',
  	"link_to" "enum__pages_v_blocks_image_text_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"anchor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_to" "enum__pages_v_blocks_call_to_action_link_to" DEFAULT 'browse',
  	"link_anchor" varchar,
  	"link_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_locales" (
  	"title" varchar,
  	"body" varchar,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_store_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_store_directory_locales" (
  	"title" varchar,
  	"lede" varchar,
  	"empty" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages" ALTER COLUMN "kind" SET DEFAULT 'page';
  ALTER TABLE "_pages_v" ALTER COLUMN "version_kind" SET DEFAULT 'page';
  ALTER TABLE "pages_blocks_home_hero_signals" ADD CONSTRAINT "pages_blocks_home_hero_signals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_home_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_home_hero_signals_locales" ADD CONSTRAINT "pages_blocks_home_hero_signals_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_home_hero_signals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_home_hero" ADD CONSTRAINT "pages_blocks_home_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_home_hero_locales" ADD CONSTRAINT "pages_blocks_home_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_home_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_rail" ADD CONSTRAINT "pages_blocks_category_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_rail_locales" ADD CONSTRAINT "pages_blocks_category_rail_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_rail" ADD CONSTRAINT "pages_blocks_product_rail_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_rail" ADD CONSTRAINT "pages_blocks_product_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_rail_locales" ADD CONSTRAINT "pages_blocks_product_rail_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_steps" ADD CONSTRAINT "pages_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_steps_locales" ADD CONSTRAINT "pages_blocks_steps_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps" ADD CONSTRAINT "pages_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_locales" ADD CONSTRAINT "pages_blocks_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_story_facts" ADD CONSTRAINT "pages_blocks_story_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_story"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_story_facts_locales" ADD CONSTRAINT "pages_blocks_story_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_story_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_story" ADD CONSTRAINT "pages_blocks_story_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_story_locales" ADD CONSTRAINT "pages_blocks_story_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_story"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_originals" ADD CONSTRAINT "pages_blocks_originals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_originals_locales" ADD CONSTRAINT "pages_blocks_originals_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_originals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_page_hero" ADD CONSTRAINT "pages_blocks_page_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_page_hero_locales" ADD CONSTRAINT "pages_blocks_page_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_page_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_fact_strip_facts" ADD CONSTRAINT "pages_blocks_fact_strip_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_fact_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_fact_strip_facts_locales" ADD CONSTRAINT "pages_blocks_fact_strip_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_fact_strip_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_fact_strip" ADD CONSTRAINT "pages_blocks_fact_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_offer_terms" ADD CONSTRAINT "pages_blocks_offer_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_offer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_offer_terms_locales" ADD CONSTRAINT "pages_blocks_offer_terms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_offer_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_offer" ADD CONSTRAINT "pages_blocks_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_offer_locales" ADD CONSTRAINT "pages_blocks_offer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_offer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_enquiry" ADD CONSTRAINT "pages_blocks_enquiry_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_enquiry_locales" ADD CONSTRAINT "pages_blocks_enquiry_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_enquiry"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partner_sign_in" ADD CONSTRAINT "pages_blocks_partner_sign_in_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_partner_sign_in_locales" ADD CONSTRAINT "pages_blocks_partner_sign_in_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_partner_sign_in"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text" ADD CONSTRAINT "pages_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_text_locales" ADD CONSTRAINT "pages_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text_locales" ADD CONSTRAINT "pages_blocks_image_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_locales" ADD CONSTRAINT "pages_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_store_directory" ADD CONSTRAINT "pages_blocks_store_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_store_directory_locales" ADD CONSTRAINT "pages_blocks_store_directory_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_store_directory"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_home_hero_signals" ADD CONSTRAINT "_pages_v_blocks_home_hero_signals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_home_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_home_hero_signals_locales" ADD CONSTRAINT "_pages_v_blocks_home_hero_signals_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_home_hero_signals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_home_hero" ADD CONSTRAINT "_pages_v_blocks_home_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_home_hero_locales" ADD CONSTRAINT "_pages_v_blocks_home_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_home_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_rail" ADD CONSTRAINT "_pages_v_blocks_category_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_rail_locales" ADD CONSTRAINT "_pages_v_blocks_category_rail_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_rail" ADD CONSTRAINT "_pages_v_blocks_product_rail_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_rail" ADD CONSTRAINT "_pages_v_blocks_product_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_rail_locales" ADD CONSTRAINT "_pages_v_blocks_product_rail_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_steps" ADD CONSTRAINT "_pages_v_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_steps_locales" ADD CONSTRAINT "_pages_v_blocks_steps_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_steps_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps" ADD CONSTRAINT "_pages_v_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_locales" ADD CONSTRAINT "_pages_v_blocks_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_story_facts" ADD CONSTRAINT "_pages_v_blocks_story_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_story"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_story_facts_locales" ADD CONSTRAINT "_pages_v_blocks_story_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_story_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_story" ADD CONSTRAINT "_pages_v_blocks_story_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_story_locales" ADD CONSTRAINT "_pages_v_blocks_story_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_story"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_originals" ADD CONSTRAINT "_pages_v_blocks_originals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_originals_locales" ADD CONSTRAINT "_pages_v_blocks_originals_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_originals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_page_hero" ADD CONSTRAINT "_pages_v_blocks_page_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_page_hero_locales" ADD CONSTRAINT "_pages_v_blocks_page_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_page_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_fact_strip_facts" ADD CONSTRAINT "_pages_v_blocks_fact_strip_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_fact_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_fact_strip_facts_locales" ADD CONSTRAINT "_pages_v_blocks_fact_strip_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_fact_strip_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_fact_strip" ADD CONSTRAINT "_pages_v_blocks_fact_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_offer_terms" ADD CONSTRAINT "_pages_v_blocks_offer_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_offer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_offer_terms_locales" ADD CONSTRAINT "_pages_v_blocks_offer_terms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_offer_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_offer" ADD CONSTRAINT "_pages_v_blocks_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_offer_locales" ADD CONSTRAINT "_pages_v_blocks_offer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_offer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_enquiry" ADD CONSTRAINT "_pages_v_blocks_enquiry_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_enquiry_locales" ADD CONSTRAINT "_pages_v_blocks_enquiry_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_enquiry"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partner_sign_in" ADD CONSTRAINT "_pages_v_blocks_partner_sign_in_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_partner_sign_in_locales" ADD CONSTRAINT "_pages_v_blocks_partner_sign_in_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_partner_sign_in"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text" ADD CONSTRAINT "_pages_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_text_locales" ADD CONSTRAINT "_pages_v_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text_locales" ADD CONSTRAINT "_pages_v_blocks_image_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD CONSTRAINT "_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" ADD CONSTRAINT "_pages_v_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_store_directory" ADD CONSTRAINT "_pages_v_blocks_store_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_store_directory_locales" ADD CONSTRAINT "_pages_v_blocks_store_directory_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_store_directory"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_home_hero_signals_order_idx" ON "pages_blocks_home_hero_signals" USING btree ("_order");
  CREATE INDEX "pages_blocks_home_hero_signals_parent_id_idx" ON "pages_blocks_home_hero_signals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_home_hero_signals_locales_locale_parent_id_uniq" ON "pages_blocks_home_hero_signals_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_home_hero_order_idx" ON "pages_blocks_home_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_home_hero_parent_id_idx" ON "pages_blocks_home_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_home_hero_path_idx" ON "pages_blocks_home_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_home_hero_locales_locale_parent_id_unique" ON "pages_blocks_home_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_category_rail_order_idx" ON "pages_blocks_category_rail" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_rail_parent_id_idx" ON "pages_blocks_category_rail" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_rail_path_idx" ON "pages_blocks_category_rail" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_category_rail_locales_locale_parent_id_unique" ON "pages_blocks_category_rail_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_product_rail_order_idx" ON "pages_blocks_product_rail" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_rail_parent_id_idx" ON "pages_blocks_product_rail" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_rail_path_idx" ON "pages_blocks_product_rail" USING btree ("_path");
  CREATE INDEX "pages_blocks_product_rail_category_idx" ON "pages_blocks_product_rail" USING btree ("category_id");
  CREATE UNIQUE INDEX "pages_blocks_product_rail_locales_locale_parent_id_unique" ON "pages_blocks_product_rail_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_steps_steps_order_idx" ON "pages_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_steps_parent_id_idx" ON "pages_blocks_steps_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_steps_steps_locales_locale_parent_id_unique" ON "pages_blocks_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_steps_order_idx" ON "pages_blocks_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_parent_id_idx" ON "pages_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_path_idx" ON "pages_blocks_steps" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_steps_locales_locale_parent_id_unique" ON "pages_blocks_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_story_facts_order_idx" ON "pages_blocks_story_facts" USING btree ("_order");
  CREATE INDEX "pages_blocks_story_facts_parent_id_idx" ON "pages_blocks_story_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_story_facts_locales_locale_parent_id_unique" ON "pages_blocks_story_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_story_order_idx" ON "pages_blocks_story" USING btree ("_order");
  CREATE INDEX "pages_blocks_story_parent_id_idx" ON "pages_blocks_story" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_story_path_idx" ON "pages_blocks_story" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_story_locales_locale_parent_id_unique" ON "pages_blocks_story_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_originals_order_idx" ON "pages_blocks_originals" USING btree ("_order");
  CREATE INDEX "pages_blocks_originals_parent_id_idx" ON "pages_blocks_originals" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_originals_path_idx" ON "pages_blocks_originals" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_originals_locales_locale_parent_id_unique" ON "pages_blocks_originals_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_page_hero_order_idx" ON "pages_blocks_page_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_page_hero_parent_id_idx" ON "pages_blocks_page_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_page_hero_path_idx" ON "pages_blocks_page_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_page_hero_locales_locale_parent_id_unique" ON "pages_blocks_page_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_fact_strip_facts_order_idx" ON "pages_blocks_fact_strip_facts" USING btree ("_order");
  CREATE INDEX "pages_blocks_fact_strip_facts_parent_id_idx" ON "pages_blocks_fact_strip_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_fact_strip_facts_locales_locale_parent_id_uniqu" ON "pages_blocks_fact_strip_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_fact_strip_order_idx" ON "pages_blocks_fact_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_fact_strip_parent_id_idx" ON "pages_blocks_fact_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_fact_strip_path_idx" ON "pages_blocks_fact_strip" USING btree ("_path");
  CREATE INDEX "pages_blocks_offer_terms_order_idx" ON "pages_blocks_offer_terms" USING btree ("_order");
  CREATE INDEX "pages_blocks_offer_terms_parent_id_idx" ON "pages_blocks_offer_terms" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_offer_terms_locales_locale_parent_id_unique" ON "pages_blocks_offer_terms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_offer_order_idx" ON "pages_blocks_offer" USING btree ("_order");
  CREATE INDEX "pages_blocks_offer_parent_id_idx" ON "pages_blocks_offer" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_offer_path_idx" ON "pages_blocks_offer" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_offer_locales_locale_parent_id_unique" ON "pages_blocks_offer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_enquiry_order_idx" ON "pages_blocks_enquiry" USING btree ("_order");
  CREATE INDEX "pages_blocks_enquiry_parent_id_idx" ON "pages_blocks_enquiry" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_enquiry_path_idx" ON "pages_blocks_enquiry" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_enquiry_locales_locale_parent_id_unique" ON "pages_blocks_enquiry_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_partner_sign_in_order_idx" ON "pages_blocks_partner_sign_in" USING btree ("_order");
  CREATE INDEX "pages_blocks_partner_sign_in_parent_id_idx" ON "pages_blocks_partner_sign_in" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_partner_sign_in_path_idx" ON "pages_blocks_partner_sign_in" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_partner_sign_in_locales_locale_parent_id_unique" ON "pages_blocks_partner_sign_in_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_text_order_idx" ON "pages_blocks_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_text_parent_id_idx" ON "pages_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_text_path_idx" ON "pages_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_text_locales_locale_parent_id_unique" ON "pages_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_image_text_order_idx" ON "pages_blocks_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_parent_id_idx" ON "pages_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_path_idx" ON "pages_blocks_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_image_idx" ON "pages_blocks_image_text" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_image_text_locales_locale_parent_id_unique" ON "pages_blocks_image_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_call_to_action_locales_locale_parent_id_unique" ON "pages_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_store_directory_order_idx" ON "pages_blocks_store_directory" USING btree ("_order");
  CREATE INDEX "pages_blocks_store_directory_parent_id_idx" ON "pages_blocks_store_directory" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_store_directory_path_idx" ON "pages_blocks_store_directory" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_store_directory_locales_locale_parent_id_unique" ON "pages_blocks_store_directory_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_home_hero_signals_order_idx" ON "_pages_v_blocks_home_hero_signals" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_home_hero_signals_parent_id_idx" ON "_pages_v_blocks_home_hero_signals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_home_hero_signals_locales_locale_parent_id_u" ON "_pages_v_blocks_home_hero_signals_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_home_hero_order_idx" ON "_pages_v_blocks_home_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_home_hero_parent_id_idx" ON "_pages_v_blocks_home_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_home_hero_path_idx" ON "_pages_v_blocks_home_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_home_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_home_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_category_rail_order_idx" ON "_pages_v_blocks_category_rail" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_category_rail_parent_id_idx" ON "_pages_v_blocks_category_rail" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_category_rail_path_idx" ON "_pages_v_blocks_category_rail" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_category_rail_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_category_rail_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_product_rail_order_idx" ON "_pages_v_blocks_product_rail" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_rail_parent_id_idx" ON "_pages_v_blocks_product_rail" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_rail_path_idx" ON "_pages_v_blocks_product_rail" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_product_rail_category_idx" ON "_pages_v_blocks_product_rail" USING btree ("category_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_product_rail_locales_locale_parent_id_unique" ON "_pages_v_blocks_product_rail_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_steps_order_idx" ON "_pages_v_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_steps_steps_parent_id_idx" ON "_pages_v_blocks_steps_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_steps_steps_locales_locale_parent_id_unique" ON "_pages_v_blocks_steps_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_order_idx" ON "_pages_v_blocks_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_steps_parent_id_idx" ON "_pages_v_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_path_idx" ON "_pages_v_blocks_steps" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_steps_locales_locale_parent_id_unique" ON "_pages_v_blocks_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_story_facts_order_idx" ON "_pages_v_blocks_story_facts" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_story_facts_parent_id_idx" ON "_pages_v_blocks_story_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_story_facts_locales_locale_parent_id_unique" ON "_pages_v_blocks_story_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_story_order_idx" ON "_pages_v_blocks_story" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_story_parent_id_idx" ON "_pages_v_blocks_story" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_story_path_idx" ON "_pages_v_blocks_story" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_story_locales_locale_parent_id_unique" ON "_pages_v_blocks_story_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_originals_order_idx" ON "_pages_v_blocks_originals" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_originals_parent_id_idx" ON "_pages_v_blocks_originals" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_originals_path_idx" ON "_pages_v_blocks_originals" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_originals_locales_locale_parent_id_unique" ON "_pages_v_blocks_originals_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_page_hero_order_idx" ON "_pages_v_blocks_page_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_page_hero_parent_id_idx" ON "_pages_v_blocks_page_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_page_hero_path_idx" ON "_pages_v_blocks_page_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_page_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_page_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_fact_strip_facts_order_idx" ON "_pages_v_blocks_fact_strip_facts" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_fact_strip_facts_parent_id_idx" ON "_pages_v_blocks_fact_strip_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_fact_strip_facts_locales_locale_parent_id_un" ON "_pages_v_blocks_fact_strip_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_fact_strip_order_idx" ON "_pages_v_blocks_fact_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_fact_strip_parent_id_idx" ON "_pages_v_blocks_fact_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_fact_strip_path_idx" ON "_pages_v_blocks_fact_strip" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_offer_terms_order_idx" ON "_pages_v_blocks_offer_terms" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_offer_terms_parent_id_idx" ON "_pages_v_blocks_offer_terms" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_offer_terms_locales_locale_parent_id_unique" ON "_pages_v_blocks_offer_terms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_offer_order_idx" ON "_pages_v_blocks_offer" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_offer_parent_id_idx" ON "_pages_v_blocks_offer" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_offer_path_idx" ON "_pages_v_blocks_offer" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_offer_locales_locale_parent_id_unique" ON "_pages_v_blocks_offer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_enquiry_order_idx" ON "_pages_v_blocks_enquiry" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_enquiry_parent_id_idx" ON "_pages_v_blocks_enquiry" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_enquiry_path_idx" ON "_pages_v_blocks_enquiry" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_enquiry_locales_locale_parent_id_unique" ON "_pages_v_blocks_enquiry_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_partner_sign_in_order_idx" ON "_pages_v_blocks_partner_sign_in" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_partner_sign_in_parent_id_idx" ON "_pages_v_blocks_partner_sign_in" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_partner_sign_in_path_idx" ON "_pages_v_blocks_partner_sign_in" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_partner_sign_in_locales_locale_parent_id_uni" ON "_pages_v_blocks_partner_sign_in_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_text_order_idx" ON "_pages_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_text_parent_id_idx" ON "_pages_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_text_path_idx" ON "_pages_v_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_order_idx" ON "_pages_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_parent_id_idx" ON "_pages_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_path_idx" ON "_pages_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_image_idx" ON "_pages_v_blocks_image_text" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_image_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_image_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_order_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_parent_id_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_path_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_call_to_action_locales_locale_parent_id_uniq" ON "_pages_v_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_store_directory_order_idx" ON "_pages_v_blocks_store_directory" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_store_directory_parent_id_idx" ON "_pages_v_blocks_store_directory" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_store_directory_path_idx" ON "_pages_v_blocks_store_directory" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_store_directory_locales_locale_parent_id_uni" ON "_pages_v_blocks_store_directory_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_home_hero_signals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_home_hero_signals_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_home_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_home_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_category_rail" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_category_rail_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_product_rail" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_product_rail_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_steps_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_steps_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_story_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_story_facts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_story" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_story_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_originals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_originals_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_page_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_page_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_fact_strip_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_fact_strip_facts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_fact_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_offer_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_offer_terms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_offer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_offer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_enquiry" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_enquiry_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_partner_sign_in" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_partner_sign_in_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_store_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_store_directory_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_home_hero_signals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_home_hero_signals_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_home_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_home_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_category_rail" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_category_rail_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_product_rail" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_product_rail_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_steps_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_steps_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_story_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_story_facts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_story" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_story_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_originals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_originals_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_page_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_page_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_fact_strip_facts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_fact_strip_facts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_fact_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_offer_terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_offer_terms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_offer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_offer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_enquiry" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_enquiry_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_partner_sign_in" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_partner_sign_in_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_store_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_store_directory_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_home_hero_signals" CASCADE;
  DROP TABLE "pages_blocks_home_hero_signals_locales" CASCADE;
  DROP TABLE "pages_blocks_home_hero" CASCADE;
  DROP TABLE "pages_blocks_home_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_category_rail" CASCADE;
  DROP TABLE "pages_blocks_category_rail_locales" CASCADE;
  DROP TABLE "pages_blocks_product_rail" CASCADE;
  DROP TABLE "pages_blocks_product_rail_locales" CASCADE;
  DROP TABLE "pages_blocks_steps_steps" CASCADE;
  DROP TABLE "pages_blocks_steps_steps_locales" CASCADE;
  DROP TABLE "pages_blocks_steps" CASCADE;
  DROP TABLE "pages_blocks_steps_locales" CASCADE;
  DROP TABLE "pages_blocks_story_facts" CASCADE;
  DROP TABLE "pages_blocks_story_facts_locales" CASCADE;
  DROP TABLE "pages_blocks_story" CASCADE;
  DROP TABLE "pages_blocks_story_locales" CASCADE;
  DROP TABLE "pages_blocks_originals" CASCADE;
  DROP TABLE "pages_blocks_originals_locales" CASCADE;
  DROP TABLE "pages_blocks_page_hero" CASCADE;
  DROP TABLE "pages_blocks_page_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_fact_strip_facts" CASCADE;
  DROP TABLE "pages_blocks_fact_strip_facts_locales" CASCADE;
  DROP TABLE "pages_blocks_fact_strip" CASCADE;
  DROP TABLE "pages_blocks_offer_terms" CASCADE;
  DROP TABLE "pages_blocks_offer_terms_locales" CASCADE;
  DROP TABLE "pages_blocks_offer" CASCADE;
  DROP TABLE "pages_blocks_offer_locales" CASCADE;
  DROP TABLE "pages_blocks_enquiry" CASCADE;
  DROP TABLE "pages_blocks_enquiry_locales" CASCADE;
  DROP TABLE "pages_blocks_partner_sign_in" CASCADE;
  DROP TABLE "pages_blocks_partner_sign_in_locales" CASCADE;
  DROP TABLE "pages_blocks_text" CASCADE;
  DROP TABLE "pages_blocks_text_locales" CASCADE;
  DROP TABLE "pages_blocks_image_text" CASCADE;
  DROP TABLE "pages_blocks_image_text_locales" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "pages_blocks_store_directory" CASCADE;
  DROP TABLE "pages_blocks_store_directory_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_home_hero_signals" CASCADE;
  DROP TABLE "_pages_v_blocks_home_hero_signals_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_home_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_home_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_category_rail" CASCADE;
  DROP TABLE "_pages_v_blocks_category_rail_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_product_rail" CASCADE;
  DROP TABLE "_pages_v_blocks_product_rail_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_steps_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_story_facts" CASCADE;
  DROP TABLE "_pages_v_blocks_story_facts_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_story" CASCADE;
  DROP TABLE "_pages_v_blocks_story_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_originals" CASCADE;
  DROP TABLE "_pages_v_blocks_originals_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_page_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_page_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_fact_strip_facts" CASCADE;
  DROP TABLE "_pages_v_blocks_fact_strip_facts_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_fact_strip" CASCADE;
  DROP TABLE "_pages_v_blocks_offer_terms" CASCADE;
  DROP TABLE "_pages_v_blocks_offer_terms_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_offer" CASCADE;
  DROP TABLE "_pages_v_blocks_offer_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_enquiry" CASCADE;
  DROP TABLE "_pages_v_blocks_enquiry_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_partner_sign_in" CASCADE;
  DROP TABLE "_pages_v_blocks_partner_sign_in_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_text" CASCADE;
  DROP TABLE "_pages_v_blocks_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_store_directory" CASCADE;
  DROP TABLE "_pages_v_blocks_store_directory_locales" CASCADE;
  ALTER TABLE "pages" ALTER COLUMN "kind" DROP DEFAULT;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_kind" DROP DEFAULT;
  DROP TYPE "public"."enum_pages_blocks_home_hero_primary_link_to";
  DROP TYPE "public"."enum_pages_blocks_home_hero_secondary_link_to";
  DROP TYPE "public"."enum_pages_blocks_story_link_to";
  DROP TYPE "public"."enum_pages_blocks_page_hero_primary_link_to";
  DROP TYPE "public"."enum_pages_blocks_page_hero_secondary_link_to";
  DROP TYPE "public"."enum_pages_blocks_offer_link_to";
  DROP TYPE "public"."enum_pages_blocks_image_text_side";
  DROP TYPE "public"."enum_pages_blocks_image_text_link_to";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_home_hero_primary_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_home_hero_secondary_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_story_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_page_hero_primary_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_page_hero_secondary_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_offer_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_image_text_side";
  DROP TYPE "public"."enum__pages_v_blocks_image_text_link_to";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_link_to";`)
}
