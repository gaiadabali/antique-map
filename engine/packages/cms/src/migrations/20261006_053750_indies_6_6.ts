import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SET LOCAL lock_timeout = '5s'`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_order_notifications_status" AS ENUM('awaiting_quote', 'pending_payment', 'paid', 'processing', 'waiting_driver', 'on_the_way', 'delivered', 'cancelled', 'expired');
  ALTER TYPE "public"."enum_orders_history_from" ADD VALUE 'awaiting_quote' BEFORE 'pending_payment';
  ALTER TYPE "public"."enum_orders_history_to" ADD VALUE 'awaiting_quote' BEFORE 'pending_payment';
  ALTER TYPE "public"."enum_orders_status" ADD VALUE 'awaiting_quote' BEFORE 'pending_payment';
  CREATE TABLE "order_notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"status" "enum_order_notifications_status" NOT NULL,
  	"sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "orders" DROP CONSTRAINT "orders_totals_priced";
  ALTER TABLE "orders" DROP CONSTRAINT "orders_totals_whole";
  ALTER TABLE "orders" ALTER COLUMN "totals_delivery_fee" DROP DEFAULT;
  ALTER TABLE "orders" ALTER COLUMN "totals_delivery_fee" DROP NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "tracking_token_enc" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "order_notifications_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "shop_quote_window_minutes" numeric DEFAULT 120;
  ALTER TABLE "order_notifications" ADD CONSTRAINT "order_notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "order_notifications_order_idx" ON "order_notifications" USING btree ("order_id");
  CREATE INDEX "order_notifications_updated_at_idx" ON "order_notifications" USING btree ("updated_at");
  CREATE INDEX "order_notifications_created_at_idx" ON "order_notifications" USING btree ("created_at");
  CREATE UNIQUE INDEX "order_status_idx" ON "order_notifications" USING btree ("order_id","status");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_notifications_fk" FOREIGN KEY ("order_notifications_id") REFERENCES "public"."order_notifications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_order_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("order_notifications_id");
  ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_priced" CHECK (totals_subtotal IS NOT NULL AND totals_subtotal >= 0 AND totals_discount IS NOT NULL AND totals_discount >= 0 AND totals_total IS NOT NULL AND totals_total >= 0 AND (totals_delivery_fee IS NULL OR totals_delivery_fee >= 0) AND totals_discount <= totals_subtotal AND totals_total = totals_subtotal - totals_discount + COALESCE(totals_delivery_fee, 0));
  ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_whole" CHECK (totals_subtotal = trunc(totals_subtotal) AND totals_discount = trunc(totals_discount) AND totals_total = trunc(totals_total) AND (totals_delivery_fee IS NULL OR totals_delivery_fee = trunc(totals_delivery_fee)));`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "order_notifications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "order_notifications" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "orders_totals_priced";
  ALTER TABLE "orders" DROP CONSTRAINT "orders_totals_whole";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_order_notifications_fk";
  
  ALTER TABLE "orders_history" ALTER COLUMN "from" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_history_from";
  CREATE TYPE "public"."enum_orders_history_from" AS ENUM('pending_payment', 'paid', 'processing', 'waiting_driver', 'on_the_way', 'delivered', 'cancelled', 'expired');
  ALTER TABLE "orders_history" ALTER COLUMN "from" SET DATA TYPE "public"."enum_orders_history_from" USING "from"::"public"."enum_orders_history_from";
  ALTER TABLE "orders_history" ALTER COLUMN "to" SET DATA TYPE text;
  DROP TYPE "public"."enum_orders_history_to";
  CREATE TYPE "public"."enum_orders_history_to" AS ENUM('pending_payment', 'paid', 'processing', 'waiting_driver', 'on_the_way', 'delivered', 'cancelled', 'expired');
  ALTER TABLE "orders_history" ALTER COLUMN "to" SET DATA TYPE "public"."enum_orders_history_to" USING "to"::"public"."enum_orders_history_to";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending_payment'::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending_payment', 'paid', 'processing', 'waiting_driver', 'on_the_way', 'delivered', 'cancelled', 'expired');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending_payment'::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";
  DROP INDEX "payload_locked_documents_rels_order_notifications_id_idx";
  ALTER TABLE "orders" ALTER COLUMN "totals_delivery_fee" SET DEFAULT 0;
  ALTER TABLE "orders" ALTER COLUMN "totals_delivery_fee" SET NOT NULL;
  ALTER TABLE "orders" DROP COLUMN "tracking_token_enc";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "order_notifications_id";
  ALTER TABLE "site_settings" DROP COLUMN "shop_quote_window_minutes";
  ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_priced" CHECK (totals_subtotal IS NOT NULL AND totals_subtotal >= 0 AND totals_discount IS NOT NULL AND totals_discount >= 0 AND totals_delivery_fee IS NOT NULL AND totals_delivery_fee >= 0 AND totals_total IS NOT NULL AND totals_total >= 0 AND totals_discount <= totals_subtotal AND totals_total = totals_subtotal - totals_discount + totals_delivery_fee);
  ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_whole" CHECK (totals_subtotal = trunc(totals_subtotal) AND totals_discount = trunc(totals_discount) AND totals_delivery_fee = trunc(totals_delivery_fee) AND totals_total = trunc(totals_total));
  DROP TYPE "public"."enum_order_notifications_status";`)
}
