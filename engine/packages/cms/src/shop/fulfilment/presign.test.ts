import { describe, expect, it } from 'vitest'

import { presignGetUrl, s3Encode, signedGetQuery } from './presign'

// AWS's worked example for a presigned GET ("Authenticating Requests: Using Query Parameters",
// Amazon S3 API Reference, Signature Version 4): its published signature is the oracle.
const AWS_EXAMPLE = {
  host: 'examplebucket.s3.amazonaws.com',
  path: '/test.txt',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
  expiresInSeconds: 86400,
  now: new Date('2013-05-24T00:00:00Z'),
}

describe('presigned GET (SigV4, query string)', () => {
  it("matches AWS's worked example exactly", () => {
    expect(signedGetQuery(AWS_EXAMPLE)).toBe(
      'X-Amz-Algorithm=AWS4-HMAC-SHA256' +
        '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request' +
        '&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host' +
        '&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    )
  })

  it('encodes as S3 does: unreserved characters kept, everything else as %XX', () => {
    expect(s3Encode("a b+c/d!'()*~")).toBe('a%20b%2Bc%2Fd%21%27%28%29%2A~')
    expect(s3Encode('orders/12/a b.webp', true)).toBe('orders/12/a%20b.webp')
    expect(s3Encode('é')).toBe('%C3%A9')
  })

  it('addresses the bucket path-style on the endpoint, port included', () => {
    const url = new URL(
      presignGetUrl({
        endpoint: 'http://localhost:9000',
        bucket: 'media',
        key: 'orders/7/1-ab.webp',
        region: 'auto',
        credentials: AWS_EXAMPLE.credentials,
        expiresInSeconds: 300,
        now: AWS_EXAMPLE.now,
      }),
    )
    expect(url.origin).toBe('http://localhost:9000')
    expect(url.pathname).toBe('/media/orders/7/1-ab.webp')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('refuses a lifetime S3 would not honour', () => {
    const at = (expiresInSeconds: number) => () =>
      presignGetUrl({
        endpoint: 'http://localhost:9000',
        bucket: 'media',
        key: 'k',
        region: 'auto',
        credentials: AWS_EXAMPLE.credentials,
        expiresInSeconds,
      })
    expect(at(0)).toThrow(RangeError)
    expect(at(604_801)).toThrow(RangeError)
    expect(at(1.5)).toThrow(RangeError)
  })
})
