import { describe, expect, it } from 'vitest'

import { buildCommand, resolveTransport } from './transport.mjs'

describe('resolveTransport', () => {
  it('defaults to compose with a bare environment', () => {
    expect(resolveTransport({})).toBe('compose')
  })

  it('switches to direct when PGHOST is set', () => {
    expect(resolveTransport({ PGHOST: '127.0.0.1' })).toBe('direct')
  })

  it('PG_TRANSPORT=direct forces direct even without PGHOST', () => {
    expect(resolveTransport({ PG_TRANSPORT: 'direct' })).toBe('direct')
  })

  it('PG_TRANSPORT=compose forces compose even with PGHOST set', () => {
    expect(resolveTransport({ PG_TRANSPORT: 'compose', PGHOST: '127.0.0.1' })).toBe('compose')
  })
})

describe('buildCommand', () => {
  it('compose: wraps the binary in `docker compose exec`, defaults intact', () => {
    const { bin, args } = buildCommand('psql', ['--dbname', 'postgres'], {})
    expect(bin).toBe('docker')
    expect(args).toEqual([
      'compose',
      '-p',
      'indies-platform-dev',
      '-f',
      'docker-compose.dev.yml',
      'exec',
      '-T',
      'postgres',
      'psql',
      '--username',
      'postgres',
      '--dbname',
      'postgres',
    ])
  })

  it('compose: honours COMPOSE_PROJECT_NAME / DOCKER_COMPOSE_FILE / POSTGRES_USER overrides', () => {
    const { args } = buildCommand('pg_dump', ['db'], {
      COMPOSE_PROJECT_NAME: 'other-project',
      DOCKER_COMPOSE_FILE: 'other.yml',
      POSTGRES_USER: 'app',
    })
    expect(args).toEqual([
      'compose',
      '-p',
      'other-project',
      '-f',
      'other.yml',
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '--username',
      'app',
      'db',
    ])
  })

  it('direct: runs the binary itself with -h/-p/--username, no docker wrapper', () => {
    const { bin, args } = buildCommand('psql', ['--dbname', 'postgres'], {
      PGHOST: '127.0.0.1',
      PGPORT: '5433',
    })
    expect(bin).toBe('psql')
    expect(args).toEqual([
      '-h',
      '127.0.0.1',
      '-p',
      '5433',
      '--username',
      'postgres',
      '--dbname',
      'postgres',
    ])
  })

  it('direct: defaults PGPORT to 5432 and POSTGRES_USER to postgres', () => {
    const { args } = buildCommand('pg_dump', ['db'], { PGHOST: 'db.internal' })
    expect(args).toEqual(['-h', 'db.internal', '-p', '5432', '--username', 'postgres', 'db'])
  })

  it('never places a password on the command line', () => {
    const { args } = buildCommand('psql', ['--dbname', 'postgres'], {
      PGHOST: '127.0.0.1',
      PGPASSWORD: 'super-secret',
    })
    expect(args.join(' ')).not.toContain('super-secret')
  })
})
