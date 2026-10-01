import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { PRINT_FILES_PREFIX } from '../../contract'
import { PUBLIC_MEDIA_PREFIXES, UPLOADS_PREFIX } from '../prefixes'
import {
  BUCKET_POLICY,
  deriveLocalSecret,
  describe as describeOperation,
  KEY_POLICIES,
  loadDocument,
  mcCommand,
  planOperations,
  planProblems,
  POLICY_FILE,
  renderPolicy,
  secretVariable,
} from './plan.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const localPlan = JSON.parse(readFileSync(join(here, '..', 'plans', 'local.json'), 'utf8'))
const statementsOf = (document) => document.Statement
const resourcesOf = (statement) => statement.Resource

describe('the policy documents (8.3.c, 8.3.g)', () => {
  it("lets the public read a media bucket's derivatives and capped tiles, and nothing else", () => {
    const document = renderPolicy(loadDocument(BUCKET_POLICY), { mediaBucket: 'b' })
    expect(statementsOf(document)).toHaveLength(1)
    const [statement] = statementsOf(document)
    expect(statement).toMatchObject({
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
    })
    expect(resourcesOf(statement)).toEqual(
      PUBLIC_MEDIA_PREFIXES.map((prefix) => `arn:aws:s3:::b/${prefix}*`),
    )
    expect(resourcesOf(statement).some((r) => r.includes(UPLOADS_PREFIX))).toBe(false)
  })

  it('lets the outlet write only under print-files/, and read captures and print files', () => {
    const document = renderPolicy(loadDocument('masters-outlet'), { mastersBucket: 'm' })
    const writes = statementsOf(document).filter((s) =>
      s.Action.some((action) => ['s3:PutObject', 's3:DeleteObject'].includes(action)),
    )
    expect(writes.flatMap(resourcesOf)).toEqual([`arn:aws:s3:::m/${PRINT_FILES_PREFIX}*`])
    const reads = statementsOf(document).filter((s) => s.Action.includes('s3:GetObject'))
    expect(reads.flatMap(resourcesOf).sort()).toEqual(
      ['arn:aws:s3:::m/masters/*', `arn:aws:s3:::m/${PRINT_FILES_PREFIX}*`].sort(),
    )
    expect(statementsOf(document).every((s) => s.Effect === 'Allow' && !s.Principal)).toBe(true)
  })

  it("keeps a media writer to its own bucket and the origin's masters key to the masters bucket", () => {
    const media = renderPolicy(loadDocument('media-writer'), { mediaBucket: 'one-media' })
    expect(statementsOf(media).flatMap(resourcesOf)).toEqual([
      'arn:aws:s3:::one-media',
      'arn:aws:s3:::one-media/*',
    ])
    const origin = renderPolicy(loadDocument('masters-origin'), { mastersBucket: 'm' })
    expect(statementsOf(origin).flatMap(resourcesOf)).toEqual([
      'arn:aws:s3:::m',
      'arn:aws:s3:::m/*',
    ])
  })

  it('refuses to render a placeholder it has no value for', () => {
    expect(() => renderPolicy(loadDocument('media-writer'), {})).toThrow(
      /no value for \{\{mediaBucket\}\}/,
    )
    for (const [name, vars] of Object.entries(KEY_POLICIES)) {
      const values = Object.fromEntries(vars.map((v) => [v, 'x-bucket']))
      expect(JSON.stringify(renderPolicy(loadDocument(name), values))).not.toMatch(/\{\{/)
    }
  })
})

describe('a plan', () => {
  it('the local one is valid and mirrors production: per brand a media key and a masters key', () => {
    expect(planProblems(localPlan)).toEqual([])
    const policiesOf = (prefix) =>
      localPlan.users.filter((u) => u.user.startsWith(prefix)).map((u) => u.policy)
    expect(policiesOf('oei-')).toEqual(['media-writer', 'masters-outlet'])
    expect(policiesOf('ig-')).toEqual(['media-writer', 'masters-origin'])
    expect(policiesOf('test-').sort()).toEqual(['masters-origin', 'masters-outlet', 'media-writer'])
  })

  it('names every problem at once', () => {
    expect(
      planProblems({
        mastersBucket: 'A',
        mediaBuckets: ['x-media', 'A'],
        users: [
          { user: 'ok-user', policy: 'media-writer', bucket: 'elsewhere' },
          { user: 'ok-user', policy: 'masters-outlet', bucket: 'x-media' },
          { user: '-bad', policy: 'superuser' },
        ],
      }),
    ).toEqual([
      'mastersBucket: a bucket name',
      'mediaBuckets: "A" is not a bucket name',
      '"A" cannot be public and private',
      'users[0].bucket: a media-writer names one of mediaBuckets',
      'users[1].user: "ok-user" twice',
      'users[1].bucket: only a media-writer names a bucket',
      'users[2].user: 3–20 of a-z, 0-9 and -',
      'users[2].policy: one of media-writer, masters-origin, masters-outlet',
    ])
  })

  it('applies bucket policies first, each key policy once, then each user and its policy', () => {
    const operations = planOperations(localPlan, { secretFor: (user) => `secret-of-${user}` })
    const kinds = operations.map((o) => o.kind)
    expect(kinds.slice(0, 4)).toEqual([
      'bucket-policy',
      'bucket-policy',
      'bucket-policy',
      'bucket-private',
    ])
    expect(operations.filter((o) => o.kind === 'key-policy').map((o) => o.name)).toEqual([
      'media-writer-ig-media',
      'masters-origin',
      'media-writer-oei-media',
      'masters-outlet',
      'media-writer-test-media',
    ])
    expect(operations.filter((o) => o.kind === 'user')).toHaveLength(localPlan.users.length)
    expect(operations.map(describeOperation).join('\n')).not.toMatch(/secret-of/)
  })

  it('becomes mc commands whose documents travel as files and whose output hides the secret', () => {
    const [bucket] = planOperations(localPlan, { secretFor: () => 's3cr3t-value' })
    expect(mcCommand(bucket, 'local')).toMatchObject({
      args: ['anonymous', 'set-json', POLICY_FILE, 'local/ig-media'],
    })
    expect(JSON.parse(mcCommand(bucket, 'local').document).Statement).toHaveLength(1)
    const user = { kind: 'user', user: 'u-one', secret: 's3cr3t-value' }
    expect(mcCommand(user, 'local')).toMatchObject({ secret: 's3cr3t-value' })
    expect(
      mcCommand({ kind: 'attach', user: 'u', policy: 'p' }, 'local').alreadyDone.test(
        'policy already attached',
      ),
    ).toBe(true)
  })

  it('derives a stable local secret per user that mc cannot mistake for a flag', () => {
    const one = deriveLocalSecret('minioadmin', 'oei-masters-outlet')
    expect(one).toBe(deriveLocalSecret('minioadmin', 'oei-masters-outlet'))
    expect(one).not.toBe(deriveLocalSecret('minioadmin', 'ig-masters-origin'))
    expect(one).toMatch(/^[0-9a-f]{40}$/)
    expect(() => deriveLocalSecret('', 'x')).toThrow()
    expect(secretVariable('oei-masters-outlet')).toBe('STORAGE_SECRET_OEI_MASTERS_OUTLET')
  })
})
