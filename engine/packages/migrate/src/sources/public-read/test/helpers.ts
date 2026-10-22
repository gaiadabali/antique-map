/**
 * Test doubles for the public read: a config for a fictional origin, a fake
 * site answering from a map of paths, and a fake clock whose sleeps advance
 * time instantly — so the politeness rules are asserted on the timeline the
 * fetcher actually kept, without a test taking two seconds per request.
 */
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ResponseCache } from '../cache.ts'
import { parseReaderConfig, type ReaderConfig } from '../config.ts'
import { PoliteFetcher, type FetchLike } from '../polite-fetch.ts'

export const ORIGIN = 'https://old-store.example'

export function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')
}

export function testConfig(overrides: Record<string, unknown> = {}): ReaderConfig {
  return parseReaderConfig({
    baseUrl: ORIGIN,
    userAgent: 'TestReader/1.0 (unit tests)',
    seeds: ['/'],
    routes: {
      product: '^/product/(?<id>\\d+)-(?<slug>[^/?#]*)$',
      image: '^/storage/products/(?<productId>\\d+)-(?<imageId>\\d+)(?<size>[A-Z]?)\\.jpg$',
      listings: {
        category: '^/category/(?<id>\\d+)-(?<slug>[^/?#]*)$',
        maker: '^/mapmaker/(?<id>\\d+)-(?<slug>[^/?#]*)$',
      },
    },
    fetchQuery: { page: '*', s: ['sold'] },
    categoryTree: { variable: 'db', pathTemplate: '/category/{id}-{slug}' },
    never: ['^/account(?:[/?]|$)', '^/s(?:[/?]|$)'],
    pages: {
      product: {
        panel: '.sideinfo',
        panelRow: '.row',
        panelLabel: '.bg-dark',
        panelHeading: '.sideinfo > .bg-dark .txt',
        longTitle: '.content .box .title',
        description: '.content .box',
        soldMarker: "#add-to-cart a[href='#sold-out']",
      },
      card: {
        item: '.product-item',
        title: 'h2.title a',
        maker: '.mapmaker a',
        categories: '.category a',
        field: '.clearfix',
        fieldLabel: '.lbl',
        price: '.price',
        soldMarker: "a[href='#sold-out']",
      },
    },
    ...overrides,
  })
}

export type FakeAnswer = {
  status: number
  body?: string | Uint8Array
  type?: string
  headers?: Record<string, string>
}

export type Recorded = { url: string; at: number; method: string; headers: Record<string, string> }

export class FakeClock {
  now = 1_000_000
  readonly sleeps: number[] = []
  sleep = async (ms: number) => {
    this.sleeps.push(ms)
    this.now += ms
  }
}

/** A site answering from `routes` (path+query → answer, or a queue of answers); 404 otherwise. */
export function fakeSite(routes: Record<string, FakeAnswer | FakeAnswer[]>, clock: FakeClock) {
  const requests: Recorded[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    const parsed = new URL(url)
    const key = `${parsed.pathname}${parsed.search}`
    requests.push({
      url: key,
      at: clock.now,
      method: init.method ?? 'GET',
      headers: { ...(init.headers as Record<string, string>) },
    })
    clock.now += 150 // the answer takes a little while
    const route = routes[key]
    const answer = Array.isArray(route) ? (route.length > 1 ? route.shift() : route[0]) : route
    const {
      status,
      body = '',
      type = 'text/html; charset=UTF-8',
      headers = {},
    } = answer ?? {
      status: 404,
      body: 'not found',
    }
    return new Response(status === 204 || status === 304 ? null : body, {
      status,
      headers: { 'content-type': type, ...headers },
    })
  }
  return { fetchImpl, requests }
}

export function newFetcher(
  routes: Record<string, FakeAnswer | FakeAnswer[]>,
  options: { config?: ReaderConfig; cacheDir?: string; offline?: boolean } = {},
) {
  const clock = new FakeClock()
  const site = fakeSite(routes, clock)
  const cacheDir = options.cacheDir ?? mkdtempSync(join(tmpdir(), 'public-read-'))
  const cache = new ResponseCache(cacheDir)
  const config = options.config ?? testConfig()
  const fetcher = new PoliteFetcher({
    config,
    cache,
    fetchImpl: site.fetchImpl,
    sleep: clock.sleep,
    now: () => clock.now,
    offline: options.offline,
  })
  return { fetcher, config, clock, cache, cacheDir, requests: site.requests }
}
