export const PROFILE_ATTACHMENT_NOTEBOOK_ID = 'profile';

export interface NotebookRecord {
  id: string;
  name: string;
  avatarAttachmentId?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  pinnedAt?: number;
}

export interface ProfileRecord {
  name?: string;
  avatarAttachmentId?: string;
  updatedAt?: number;
}

export type KnownDiaryEntryType = 'text' | 'attachment';
export type DiaryEntryType = KnownDiaryEntryType | (string & {});

export function isKnownDiaryEntryType(type: string): type is KnownDiaryEntryType {
  return type === 'text' || type === 'attachment';
}

export interface DiaryEntryRecord {
  id: string;
  notebookId: string;
  type: DiaryEntryType;
  text?: string;
  attachmentId?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  externalSource?: string;
  externalId?: string;
}

export interface AttachmentRecordBase {
  id: string;
  notebookId: string;
  mimeType: string;
  size: number;
  s3Key?: string;
  thumbS3Key?: string;
  createdAt: number;
  deletedAt?: number;
}

export interface ImageAttachmentRecord extends AttachmentRecordBase {
  type: 'image';
  width: number;
  height: number;
}

export interface AudioAttachmentRecord extends AttachmentRecordBase {
  type: 'audio';
  /** 录音时长，单位秒。MediaRecorder 容器元数据不稳定，使用录制计时结果。 */
  duration: number;
}

export interface VideoAttachmentRecord extends AttachmentRecordBase {
  type: 'video';
  width: number;
  height: number;
  /** 视频时长，单位秒。 */
  duration: number;
}

export interface UnknownAttachmentRecord extends AttachmentRecordBase {
  type: 'unknown';
  originalType?: string;
}

export type AttachmentRecord =
  | ImageAttachmentRecord
  | AudioAttachmentRecord
  | VideoAttachmentRecord
  | UnknownAttachmentRecord;

export type SyncProvider = 's3' | 'webdav' | 'smb';

export interface S3ConfigRecord {
  provider: 's3';
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  forcePathStyle: boolean;
  recoveryKey?: string;
  recoveryKeyHash?: string;
  updatedAt: number;
}

export interface WebDAVConfigRecord {
  provider: 'webdav';
  url: string;
  username: string;
  password: string;
  prefix: string;
  recoveryKey?: string;
  recoveryKeyHash?: string;
  updatedAt: number;
}

export interface SMBConfigRecord {
  provider: 'smb';
  host: string;
  share: string;
  username: string;
  password: string;
  domain: string;
  prefix: string;
  recoveryKey?: string;
  recoveryKeyHash?: string;
  updatedAt: number;
}

export type SyncConfigRecord = S3ConfigRecord | WebDAVConfigRecord | SMBConfigRecord;

export interface DiaryModelData {
  version: Record<string, number>;
  profile: ProfileRecord;
  notebookOrder: string[];
  notebooks: NotebookRecord[];
  notebookMap: Map<string, NotebookRecord>;
  entries: DiaryEntryRecord[];
  entryMap: Map<string, DiaryEntryRecord>;
  attachments: AttachmentRecord[];
  attachmentMap: Map<string, AttachmentRecord>;
}

export interface CreateTextEntryOptions {
  notebookId: string;
  text: string;
  createdAt?: number;
  externalSource?: string;
  externalId?: string;
}

export interface CreateAttachmentEntryOptions {
  attachment: AttachmentRecord;
  createdAt: number;
  text?: string;
  externalSource?: string;
  externalId?: string;
}
