'use client'
/**
 * The category in the main column, under the name (TASKS.md 27.2.a; the plan's §3.2 puts it
 * second). The `category` field keeps its place in the schema — after the address, so the
 * generated types and the database stay as they are — and renders nothing there
 * (`ProductCategoryInPlace`); this `ui` field renders Payload's own relationship input for the
 * same `category` path at the top. One value in the form, one input on the screen: its search,
 * its server validation ("Choose the category before publishing") and its list column and filter
 * are Payload's, unchanged. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { FieldPathContext, RelationshipField, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useMemo } from 'react'

const PATH = 'category'

/** The client config of the products' `category` field, placed for the main column. */
function useCategoryField() {
  const { getEntityConfig } = useConfig()
  return useMemo(() => {
    const fields = getEntityConfig?.({ collectionSlug: 'products' })?.fields ?? []
    const field = fields.find((each) => each?.name === PATH)
    if (!field) return null
    const { components: _components, position: _position, ...admin } = field.admin ?? {}
    return { ...field, admin }
  }, [getEntityConfig])
}

export function ProductCategoryField({ readOnly }) {
  const field = useCategoryField()
  const { docPermissions } = useDocumentInfo()
  if (!field) return null
  const locked = readOnly === true || docPermissions?.fields?.category?.update === false
  return (
    <FieldPathContext value={PATH}>
      <RelationshipField
        field={field}
        path={PATH}
        schemaPath={`products.${PATH}`}
        readOnly={locked}
      />
    </FieldPathContext>
  )
}

/** The `category` field's own slot: empty, as the field is shown by `ProductCategoryField`. */
export function ProductCategoryInPlace() {
  return null
}
