// 文件资产对象存储模块。
// 统一封装上传配置、S3/WebDAV 对象存储、连接测试，以及加密后的附件/数据库快照读写能力。
export {
  createFileAssetObjectStore,
  type FileAssetObjectStore,
  type SyncDatabaseSnapshotMergeResult,
  type SyncDatabaseSnapshotMergeReturn,
  type SyncDatabaseSnapshotOptions,
} from './fileAssetObjectStore';
export { testUploadConnection } from './testConnection';
export { verifyExistingSync, type VerifyExistingSyncResult } from './syncImport';
export {
  emptyS3Config,
  emptyWebDAVConfig,
  emptySMBConfig,
  syncChannelDisplayName,
  type EditableS3Config,
  type EditableUploadConfig,
  type EditableWebDAVConfig,
  type EditableSMBConfig,
} from './uploadConfig';
