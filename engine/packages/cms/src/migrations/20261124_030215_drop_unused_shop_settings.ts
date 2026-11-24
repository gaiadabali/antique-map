import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "shop_contact_maps_url";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_contact_address";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_announcement";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_signal_first";
  ALTER TABLE "site_settings_locales" DROP COLUMN "shop_product_page_signal_second";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "shop_contact_maps_url" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_contact_address" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_announcement" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_signal_first" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "shop_product_page_signal_second" varchar;`)
}
