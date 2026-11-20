/**
 * The product's photos (TASKS.md 27.2.b): the `images` field's component. A server component, so
 * the saved photos' thumbnails are read as the person (`./data` `photoThumbs`: the public
 * derivative once the pipeline made it, else the staff-only file) and arrive with the page; the
 * dropping, ordering and alt text are the client's (`./photos-client.jsx`). `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { photoThumbs } from './data'
import { idOf } from './photos'
import { PhotosClient } from './photos-client'

export async function ProductPhotosField(props) {
  const { clientField, path, req, user, data, readOnly } = props
  const rows = Array.isArray(data?.images) ? data.images : []
  const ids = rows.map((row) => idOf(row?.image)).filter((id) => id !== null)
  const thumbs = req?.payload
    ? await photoThumbs(req.payload, user ?? req.user, ids, req.locale)
    : {}
  return (
    <PhotosClient
      field={clientField}
      path={path ?? 'images'}
      thumbs={thumbs}
      readOnly={readOnly === true}
    />
  )
}
