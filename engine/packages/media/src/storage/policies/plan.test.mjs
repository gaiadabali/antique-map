import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

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
  mcUserPolicyCommands,
  secretVariable,
  stalePolicies,
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

  const writesOf = (document) =>
    statementsOf(document)
      .filter((s) => s.Action.some((a) => ['s3:PutObject', 's3:DeleteObject'].includes(a)))
      .flatMap(resourcesOf)

  it('keeps the media writer to the media bucket', () => {
    const media = renderPolicy(loadDocument('media-writer'), { mediaBucket: 'one-media' })
    expect(statementsOf(media).flatMap(resourcesOf)).toEqual([
      'arn:aws:s3:::one-media',
      'arn:aws:s3:::one-media/*',
    ])
  })

  it('lets the masters key read every master and write captures only, and delete nothing', () => {
    const masters = renderPolicy(loadDocument('masters-writer'), { mastersBucket: 'm' })
    expect(writesOf(masters)).toEqual(['arn:aws:s3:::m/masters/*'])
    const reads = statementsOf(masters).filter((s) => s.Action.includes('s3:GetObject'))
    expect(reads.flatMap(resourcesOf)).toEqual(['arn:aws:s3:::m/*'])
    expect(JSON.stringify(masters)).not.toMatch(/DeleteObject|print-files|\{\{brand\}\}/)
    expect(statementsOf(masters).every((s) => s.Effect === 'Allow' && !s.Principal)).toBe(true)
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
  it('the local one is valid: one media bucket, one masters bucket, one key for each', () => {
    expect(planProblems(localPlan)).toEqual([])
    expect(localPlan.mediaBucket).toBe('test-media')
    expect(localPlan.users.map((u) => u.policy)).toEqual(['media-writer', 'masters-writer'])
  })

  it('names every problem at once', () => {
    expect(
      planProblems({
        mastersBucket: 'A',
        mediaBuckets: ['x-media'],
        mediaBucket: 'A',
        users: [
          { user: 'ok-user', policy: 'media-writer', bucket: 'elsewhere' },
          { user: 'ok-user', policy: 'masters-writer' },
          { user: '-bad', policy: 'masters-outlet' },
          { user: 'with-brand', policy: 'masters-writer', brand: 'b' },
        ],
      }),
    ).toEqual([
      'mastersBucket: a bucket name',
      'mediaBuckets: one media bucket now (mediaBucket), for both sites',
      'mediaBucket: a bucket name',
      '"A" cannot be public and private',
      "users[0]: a key names its policy only — the plan's two buckets are the only ones",
      'users[1].user: "ok-user" twice',
      'users[2].user: 3–20 of a-z, 0-9 and -',
      'users[2].policy: one of media-writer, masters-writer',
      "users[3]: a key names its policy only — the plan's two buckets are the only ones",
      "mastersCors: the admin origins the masters bucket's CORS admits",
    ])
  })

  it('applies bucket policies first, each key policy once, then each user and its policy', () => {
    const operations = planOperations(localPlan, { secretFor: (user) => `secret-of-${user}` })
    const kinds = operations.map((o) => o.kind)
    expect(kinds.slice(0, 3)).toEqual(['bucket-policy', 'bucket-private', 'bucket-cors'])
    expect(operations.filter((o) => o.kind === 'key-policy').map((o) => o.name)).toEqual([
      'media-writer',
      'masters-writer',
    ])
    expect(operations.filter((o) => o.kind === 'user')).toHaveLength(localPlan.users.length)
    expect(operations.map(describeOperation).join('\n')).not.toMatch(/secret-of/)
  })

  it('becomes mc commands whose documents travel as files and whose output hides the secret', () => {
    const [bucket] = planOperations(localPlan, { secretFor: () => 's3cr3t-value' })
    expect(mcCommand(bucket, 'local')).toMatchObject({
      args: ['anonymous', 'set-json', POLICY_FILE, 'local/test-media'],
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

  it('takes away whatever a user holds beyond the plan, since an attach only ever adds', () => {
    const info = JSON.stringify({
      accessKey: 'u',
      policyName: 'masters-origin-test,masters-writer',
    })
    expect(stalePolicies(info, 'masters-writer')).toEqual(['masters-origin-test'])
    expect(stalePolicies(JSON.stringify({ policyName: 'p' }), 'p')).toEqual([])
    expect(stalePolicies(JSON.stringify({}), 'p')).toEqual([])
    expect(mcUserPolicyCommands('local', 'u').detach('old').slice(0, 5)).toEqual([
      'admin',
      'policy',
      'detach',
      'local',
      'old',
    ])
  })

  it('derives a stable local secret per user that mc cannot mistake for a flag', () => {
    const one = deriveLocalSecret('minioadmin', 'indies-masters')
    expect(one).toBe(deriveLocalSecret('minioadmin', 'indies-masters'))
    expect(one).not.toBe(deriveLocalSecret('minioadmin', 'indies-media-writer'))
    expect(one).toMatch(/^[0-9a-f]{40}$/)
    expect(() => deriveLocalSecret('', 'x')).toThrow()
    expect(secretVariable('indies-masters')).toBe('STORAGE_SECRET_INDIES_MASTERS')
  })
})
