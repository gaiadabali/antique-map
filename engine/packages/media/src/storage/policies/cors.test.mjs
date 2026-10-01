// The masters bucket's CORS as data (TASKS.md 8.3.i): what `./apply.mjs` sets, and what a plan may
// name. The applied rule against a real storage is `./policies.minio.test.mjs`'s.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { masterKey } from '../../contract'
import { s3MastersStore } from '../masters-store'
import {
  CORS_NOT_IMPLEMENTED,
  corsOperation,
  corsProblems,
  corsXml,
  isAdmissibleOrigin,
  MASTERS_CORS_HEADERS,
  mastersCorsRules,
} from './cors.mjs'
import { describe as describeOperation, mcCommand, planOperations, POLICY_FILE } from './plan.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const localPlan = JSON.parse(readFileSync(join(here, '..', 'plans', 'local.json'), 'utf8'))
const SHA = 'a'.repeat(64)

describe("the masters bucket's CORS", () => {
  it('admits a signed PUT from each admin origin, with the headers it signs, and nothing more', () => {
    const [rule, ...others] = mastersCorsRules({ adminOrigins: ['https://admin.example'] })
    expect(others).toEqual([])
    expect(rule).toEqual({
      AllowedOrigins: ['https://admin.example'],
      AllowedMethods: ['PUT'],
      AllowedHeaders: ['content-length', 'content-type', 'x-amz-checksum-sha256'],
      MaxAgeSeconds: 3600,
    })
  })

  it('allows every header the presigned PUT signs or the browser sends', async () => {
    const store = s3MastersStore({
      endpoint: 'http://storage.invalid:9000',
      region: 'auto',
      bucket: 'archive-masters',
      credentials: { accessKeyId: 'k', secretAccessKey: 's' },
    })
    const put = await store.presignPut({
      key: masterKey('w-1', SHA, 'tif'),
      checksum: SHA,
      byteSize: 10,
      contentType: 'image/tiff',
    })
    const signed = new URL(put.url).searchParams.get('X-Amz-SignedHeaders').split(';')
    const needed = new Set([...signed.filter((h) => h !== 'host'), ...Object.keys(put.headers)])
    expect([...needed].filter((header) => !MASTERS_CORS_HEADERS.includes(header))).toEqual([])
  })

  it('takes a host’s origin over HTTPS, or a loopback one with any port, and nothing looser', () => {
    for (const origin of [
      'https://indies.example',
      'https://staging.shop.example:8443',
      'http://localhost:4355',
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://localhost',
    ]) {
      expect(isAdmissibleOrigin(origin), origin).toBe(true)
    }
    for (const origin of [
      '*',
      'https://*.example',
      'https://*',
      'http://indies.example',
      'https://indies.example/',
      'https://indies.example/admin',
      'https://Indies.example',
      'http://localhost:99999',
      'http://localhost.evil.example',
      'http://10.0.0.1:*',
      'localhost:4355',
      42,
    ]) {
      expect(isAdmissibleOrigin(origin), String(origin)).toBe(false)
    }
  })

  it('names every problem with a plan’s CORS at once', () => {
    expect(corsProblems(undefined)).toEqual([
      "mastersCors: the admin origins the masters bucket's CORS admits",
    ])
    expect(
      corsProblems({
        adminOrigins: ['*', 'https://a.example', 'https://a.example'],
        ifUnsupported: 'skip',
      }),
    ).toEqual([
      'mastersCors.adminOrigins: "*" is not https://<host>[:port] or a loopback origin',
      'mastersCors.adminOrigins: "https://a.example" twice',
      'mastersCors.ifUnsupported: one of fail, warn',
    ])
    expect(corsProblems({ adminOrigins: [] })).toEqual([
      'mastersCors.adminOrigins: at least one origin',
    ])
  })

  it('is the local plan’s: any loopback port, and a warning where the storage has no bucket CORS', () => {
    expect(corsProblems(localPlan.mastersCors)).toEqual([])
    expect(localPlan.mastersCors.adminOrigins).toEqual(['http://localhost:*', 'http://127.0.0.1:*'])
    expect(localPlan.mastersCors.ifUnsupported).toBe('warn')
    // A plan that says nothing — every host's — fails instead.
    const { ifUnsupported, ...strict } = localPlan.mastersCors
    expect(ifUnsupported).toBe('warn')
    expect(corsOperation({ ...localPlan, mastersCors: strict }).ifUnsupported).toBe('fail')
  })

  it('is applied whole, the same document every run, by mc cors set on the masters bucket', () => {
    const run = () => planOperations(localPlan, { secretFor: () => 'secret-value' })
    const [first, second] = [run(), run()].map((ops) => ops.find((o) => o.kind === 'bucket-cors'))
    expect(first).toEqual(second)
    expect(first.bucket).toBe(localPlan.mastersBucket)
    const command = mcCommand(first, 'local')
    expect(command.args).toEqual(['cors', 'set', 'local/archive-masters', POLICY_FILE])
    expect(command.document).toBe(corsXml(mastersCorsRules(localPlan.mastersCors)))
    expect(command.document).toBe(
      '<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><CORSRule>' +
        '<AllowedOrigin>http://localhost:*</AllowedOrigin><AllowedOrigin>http://127.0.0.1:*</AllowedOrigin>' +
        '<AllowedMethod>PUT</AllowedMethod><AllowedHeader>content-length</AllowedHeader>' +
        '<AllowedHeader>content-type</AllowedHeader><AllowedHeader>x-amz-checksum-sha256</AllowedHeader>' +
        '<MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule></CORSConfiguration>',
    )
    expect(describeOperation(first)).toBe(
      'bucket archive-masters: CORS admits a signed PUT from http://localhost:*, http://127.0.0.1:* only',
    )
  })

  it('knows the words of a storage that has no bucket CORS, from mc and from the S3 API', () => {
    const mc =
      'mc: <ERROR> Unable to set bucket CORS configuration for local/archive-masters. ' +
      'A header you provided implies functionality that is not implemented.'
    expect(CORS_NOT_IMPLEMENTED.test(mc)).toBe(true)
    expect(CORS_NOT_IMPLEMENTED.test('NotImplemented')).toBe(true)
    expect(CORS_NOT_IMPLEMENTED.test('Access Denied.')).toBe(false)
  })
})
