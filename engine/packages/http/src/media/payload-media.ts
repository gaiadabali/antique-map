/**
 * The media route's Payload-backed port: loaded by `./route` with `import()` once it has read its
 * path, so nothing else evaluates the Payload config (ARCHITECTURE.md §15). The rule — a video or
 * a PDF that a published shop page places, and nothing else — is `@engine/cms`'s
 * (`collections/media/public-file`).
 */
import { cms } from '@engine/cms/instance'
import { publicMediaFile, type PublicMediaFile } from '@engine/cms/media/public-file'

export type { PublicMediaFile }

export async function publicMediaFileFor(id: number): Promise<PublicMediaFile | null> {
  return publicMediaFile(await cms(), id)
}
