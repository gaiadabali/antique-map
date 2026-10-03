import { OrdersToActOnWidget as OrdersToActOnWidget_de722ad76a7872bac84d66b54f975032 } from '@engine/cms/admin/widgets'
import { NewLeadsWidget as NewLeadsWidget_de722ad76a7872bac84d66b54f975032 } from '@engine/cms/admin/widgets'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@engine/cms/admin/widgets#OrdersToActOnWidget": OrdersToActOnWidget_de722ad76a7872bac84d66b54f975032,
  "@engine/cms/admin/widgets#NewLeadsWidget": NewLeadsWidget_de722ad76a7872bac84d66b54f975032,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24
}
