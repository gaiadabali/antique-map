/**
 * Test support only — imported by tests that drive Payload's REST handler with an `Origin`, never
 * by runtime code.
 *
 * The admin origin a test's requests come from, and the environment that makes Payload trust it
 * both before TASKS.md 2.2 lands and after: today `access/origins` reads `SITE_URL`; after 2.2 it
 * builds the admin origin from `SHOP_HOSTS` (the admin host defaults to the first) and `PORT` —
 * `http://<host>:<port>` for a `*.localhost` host. The two agree on `http://shop.localhost:<port>`,
 * so one value serves both. 2.2 drops `SITE_URL` here once it has merged.
 */
export function testOrigin(port: number): { origin: string; env: Record<string, string> } {
  const origin = `http://shop.localhost:${port}`
  return {
    origin,
    env: {
      SITE_URL: origin,
      GALLERY_HOSTS: 'gallery.localhost',
      SHOP_HOSTS: 'shop.localhost',
      PORT: String(port),
    },
  }
}
