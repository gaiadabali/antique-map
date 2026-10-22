/**
 * Test support only — shared by the payments tests, never imported by runtime code: environments
 * the boot check judges local, staging and production, a config per mode, and a status builder.
 */
import { SIMULATOR_SERVER_KEY, type PaymentsConfig } from './config'
import type { MidtransStatus } from './notification'

/** Hosts the boot check judges `local` (no NODE_ENV: not a production build). */
export const LOCAL_ENV = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost' }
/** The brand's own domains on a production build: judged `production`. */
export const PRODUCTION_ENV = {
  GALLERY_HOSTS: 'antiquemapsindonesia.com',
  SHOP_HOSTS: 'oldeastindies.com',
  NODE_ENV: 'production',
}
/** The staging hosts on a production build: judged `staging`. */
export const STAGING_ENV = {
  GALLERY_HOSTS: 'indies-gallery.gaiada.com',
  SHOP_HOSTS: 'old-east-indies.gaiada.com',
  NODE_ENV: 'production',
}

/** Shaped like the real keys, but not keys: tests never read a secret. */
export const SANDBOX_KEYS = {
  MIDTRANS_SERVER_KEY: 'SB-Mid-server-TEST0000000000000000',
  MIDTRANS_CLIENT_KEY: 'SB-Mid-client-TEST0000000000000000',
}
export const LIVE_KEYS = {
  MIDTRANS_SERVER_KEY: 'Mid-server-TEST0000000000000000',
  MIDTRANS_CLIENT_KEY: 'Mid-client-TEST0000000000000000',
}

export const SIMULATE: PaymentsConfig = {
  mode: 'simulate',
  environment: 'local',
  serverKey: SIMULATOR_SERVER_KEY,
  clientKey: null,
}
export const SANDBOX: PaymentsConfig = {
  mode: 'sandbox',
  environment: 'staging',
  serverKey: SANDBOX_KEYS.MIDTRANS_SERVER_KEY,
  clientKey: SANDBOX_KEYS.MIDTRANS_CLIENT_KEY,
}

/** A confirmed status for attempt `1001-1`, Rp 205.000, settled — `overrides` changing some. */
export function statusOf(overrides: Partial<MidtransStatus> = {}): MidtransStatus {
  return {
    midtransOrderId: '1001-1',
    statusCode: '200',
    grossAmountText: '205000.00',
    grossAmount: 205000,
    transactionStatus: 'settlement',
    fraudStatus: 'accept',
    transactionId: 'b3f1c2d4-0000-4000-8000-000000000001',
    paymentType: 'qris',
    ...overrides,
  }
}
