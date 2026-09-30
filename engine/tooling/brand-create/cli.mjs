#!/usr/bin/env node
// `pnpm brand:create <slug> --storefront gallery|emporium [--name "<Name>"]` — TASKS.md 2.2.h, 3.3.a, 4.7.b.
import { BrandCreateError, createBrand } from './brand-create.mjs'

const args = process.argv.slice(2)
const slug = args.find((a) => !a.startsWith('-'))
const storefront = valueOf('--storefront')
const name = valueOf('--name')

function valueOf(flag) {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

if (!slug || !storefront) {
  console.error('usage: brand:create <slug> --storefront gallery|emporium [--name "<Name>"]')
  process.exit(2)
}

try {
  const { brandDir, infra } = await createBrand(process.cwd(), { slug, storefront, name })
  console.log(`brand:create: scaffolded ${brandDir}`)
  console.log(`  database: ${infra.database}   bucket: ${infra.bucket}`)
  console.log(
    `  validated with validateBrandConfig() (@engine/config/validate, C1) against the ${storefront} app's supports`,
  )
  console.log(
    '  next: add a .gaiadeploy.yml target, provider secrets in Infisical, and pnpm db:fresh --brand ' +
      slug,
  )
  process.exit(0)
} catch (error) {
  if (error instanceof BrandCreateError) {
    console.error(`brand:create: ${error.message}`)
    process.exit(1)
  }
  throw error
}
