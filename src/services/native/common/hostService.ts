import { createDecorator } from 'vscf/platform/instantiation/common';
import { Event } from 'vscf/base/common/event';
import type { ZodType } from 'zod';

export interface IHostService {
  readonly _serviceBrand: undefined;
  readonly isNative: boolean;
  readonly onBackButton: Event<void>;

  caniuse(feature: HostFeature): boolean;

  exitApp(): void;
  vibrateShort(): void;
  authenticateBiometric(options: HostBiometricOptions): Promise<boolean>;
  writeToClipboard(text: string): Promise<void>;
  setBarStyle(theme: HostSystemBarStyle): Promise<void>;
  /** 返回已通过图片类型和大小校验的 Blob，用户取消时返回 undefined。 */
  pickImageBlob(source: ImagePickSource): Promise<Blob | undefined>;

  /**
   * 仅 Android：从相册单选一项媒体，可能是图片或视频，用户取消时返回 undefined。
   */
  pickMediaFromGallery(options?: HostMediaPickOptions): Promise<HostGalleryPick | undefined>;
  /** 仅 Android：调用系统相机录像并保存到相册，用户取消时返回 undefined。 */
  recordVideo(options?: HostVideoRecordOptions): Promise<HostVideoPick | undefined>;
  /**
   * 仅 Android：基于 app 私有视频源准备本次上传 payload；
   * originalQuality 为 true 时跳过重编码、按原片处理。
   */
  prepareVideoUpload(options: HostPrepareVideoUploadOptions): Promise<HostVideoPrepareResult>;
  /** 仅 Android：清理 app 私有视频源。 */
  cleanVideoRecord(options: HostCleanVideoRecordOptions): Promise<void>;
  /** 附件明文文件存储：固定写入应用数据目录，写入必须保证原子替换。 */
  writeAttachmentFile(options: HostWriteAttachmentFileOptions): Promise<void>;
  /** 附件明文文件存储：不存在时返回 undefined。 */
  readAttachmentFile(options: HostAttachmentFileOptions): Promise<Blob | undefined>;

  getPreference<T>(key: string, schema?: ZodType<T>): Promise<T | undefined>;
  savePreference<T>(key: string, value: T): Promise<T>;
  clearPreference(key: string): Promise<void>;

  request(options: HostRequestOptions): Promise<HostResponse>;

  generateThumbnail(options: HostGenerateThumbnailOptions): Promise<HostGenerateThumbnailResult>;

  // 文件系统接口固定使用应用数据目录和 UTF-8 编码。
  readdir(options: HostFilesystemPathOptions): Promise<HostFilesystemReaddirResult>;
  mkdir(options: HostFilesystemMkdirOptions): Promise<void>;
  readFile(options: HostFilesystemReadFileOptions): Promise<HostFilesystemReadFileResult>;
  writeFile(options: HostFilesystemWriteFileOptions): Promise<void>;
  rmdir(options: HostFilesystemRmdirOptions): Promise<void>;
  deleteFile(options: HostFilesystemPathOptions): Promise<void>;
  rename(options: HostFilesystemRenameOptions): Promise<void>;
}

export interface HostBiometricOptions {
  title: string;
  subtitle?: string;
  reason?: string;
}

export const IHostService = createDecorator<IHostService>('IHostService');

export type HostFeature =
  | 'generateThumbnail'
  | 'webDavHttpRequest'
  | 'attachmentFileCache'
  | 'videoUpload'
  | 'videoTranscode'
  | 'biometric';

export interface HostVideoPick {
  /** 原视频已复制到 app 私有目录后的路径，task 只持久化这个路径。 */
  sourcePath: string;
  /** WebView 可播放的预览地址。 */
  webPath?: string;
  /** 系统返回的视频封面（data URL），用于预览与处理中占位。 */
  thumbnail?: string;
  mimeType: string;
  /** 原片体积，单位字节。 */
  size: number;
  /** 原片宽高，未知时为 0。 */
  width: number;
  height: number;
  /** 原片时长，单位毫秒，未知时为 0。 */
  durationMs: number;
}

export type HostGalleryPick =
  | { kind: 'image'; blob: Blob }
  | { kind: 'video'; video: HostVideoPick };

export interface HostMediaPickOptions {
  /** 视频源缓存 scope，调用方必须传当前本地数据 scope。 */
  cacheScope?: string;
}

export type HostVideoRecordOptions = HostMediaPickOptions;

export interface HostCleanVideoRecordOptions {
  sourcePath: string;
  /** 视频源缓存 scope，调用方必须传当前本地数据 scope。 */
  cacheScope?: string;
}

export interface HostPrepareVideoUploadOptions {
  sourcePath: string;
  /** 原画质：跳过重编码，按原片处理。 */
  originalQuality?: boolean;
  /** 上传产物直接写入附件文件缓存。 */
  cacheKey?: string;
  cacheScope?: string;
}

export interface HostVideoPrepareResult {
  /** 本次上传使用的 MP4。 */
  blob: Blob;
  /** 首帧 JPEG 缩略图。 */
  thumbnail: Blob;
  width: number;
  height: number;
  /** 时长，单位秒。 */
  duration: number;
  size: number;
}

export type HostSystemBarStyle = 'light' | 'dark';

export const ImagePickSource = {
  Camera: 'camera',
  Photos: 'photos',
} as const;

export type ImagePickSource = (typeof ImagePickSource)[keyof typeof ImagePickSource];

export interface HostRequestOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** base64 编码的请求体。 */
  body?: string;
}

export interface HostResponse {
  status: number;
  /** base64 编码的响应体。 */
  body: string;
}

export interface HostAttachmentFileOptions {
  scope: string;
  key: string;
}

export interface HostWriteAttachmentFileOptions extends HostAttachmentFileOptions {
  blob: Blob;
}

export interface HostGenerateThumbnailOptions {
  imageBase64: string;
  minDimension: number;
  quality: number;
}

export interface HostGenerateThumbnailResult {
  imageBase64: string;
  mimeType: string;
}

export interface HostFilesystemPathOptions {
  path: string;
}

export interface HostFilesystemMkdirOptions extends HostFilesystemPathOptions {
  recursive?: boolean;
}

export type HostFilesystemReadFileOptions = HostFilesystemPathOptions;

export interface HostFilesystemWriteFileOptions extends HostFilesystemPathOptions {
  data: string;
}

export interface HostFilesystemRmdirOptions extends HostFilesystemPathOptions {
  recursive?: boolean;
}

export interface HostFilesystemRenameOptions {
  from: string;
  to: string;
}

export interface HostFilesystemReaddirResult {
  files: HostFilesystemFileInfo[];
}

export interface HostFilesystemFileInfo {
  name: string;
  type?: 'file' | 'directory';
}

export interface HostFilesystemReadFileResult {
  data: string;
}
