/**
 * `@engine/media/storage` — where files live and who may reach them (TASKS.md 8.3): the bucket
 * each process writes, the public and private prefixes of a media bucket, upload limits and
 * types, and the masters bucket's presigned PUT. Server-only: it imports the AWS SDK.
 *
 * The bucket policies are data (`./policies/*.json`) applied by a script
 * (`pnpm --filter @engine/media storage:policies`), so staging and production (RustFS, TASKS.md
 * 41.2) apply the same documents a workstation's MinIO does.
 */
export { isSha256Hex, sha256HexOf, sha256HexToBase64, storedChecksumToHex } from './checksum'
export { mastersStorageTarget, mediaStorageTarget, s3ClientConfig, type S3Target } from './env'
export {
  formatBytes,
  MASTER_TYPES,
  MASTER_UPLOAD_MAX_BYTES,
  masterContentType,
  masterUploadProblems,
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_MIME_TYPES,
} from './limits'
export {
  CAPTURES_PREFIX,
  isIntakeKey,
  kindPrefix,
  MASTER_KINDS,
  type MasterKind,
} from './master-kinds'
export { s3BucketObjects, type BucketObjects, type PutOutcome } from './objects'
export {
  s3MastersStore,
  type MastersStore,
  type PresignedPut,
  type PresignPutInput,
  type StoredObject,
} from './masters-store'
export {
  isPublicMediaKey,
  PUBLIC_MEDIA_PREFIXES,
  UPLOADS_PREFIX,
  type PublicMediaPrefix,
} from './prefixes'
