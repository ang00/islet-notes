import {
  assertSupportedImage,
  base64ToBlob,
  blobToBase64,
  isPickCancellation,
} from '@/services/fileAsset/common/imageHandlers';
import { VIDEO_TARGET_HEIGHT, VIDEO_TARGET_VIDEO_BITRATE } from '@/base/just-vibes/media-metrics';
import type { ITestInjectionService } from '@/services/e2e/common/testInjectionService';
import { Camera, MediaType, MediaTypeSelection, type MediaResult } from '@capacitor/camera';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Emitter } from 'vscf/base/common/event';
import type { ZodType } from 'zod';
import {
  HostFeature,
  HostBiometricOptions,
  HostAttachmentFileOptions,
  HostFilesystemMkdirOptions,
  HostFilesystemPathOptions,
  HostFilesystemReaddirResult,
  HostFilesystemReadFileOptions,
  HostFilesystemReadFileResult,
  HostFilesystemRenameOptions,
  HostFilesystemRmdirOptions,
  HostFilesystemWriteFileOptions,
  HostGenerateThumbnailOptions,
  HostGenerateThumbnailResult,
  HostGalleryPick,
  HostMediaPickOptions,
  HostRequestOptions,
  HostResponse,
  HostSystemBarStyle,
  HostCleanVideoRecordOptions,
  HostPrepareVideoUploadOptions,
  HostVideoRecordOptions,
  HostVideoPick,
  HostVideoPrepareResult,
  ImagePickSource,
  IHostService,
  HostWriteAttachmentFileOptions,
} from '../common/hostService';
import {
  createMemoryHostFilesystem,
  type BrowserHostFilesystem,
} from '@/base/just-vibes/browser-host-filesystem';
import {
  createBrowserAttachmentBlobStore,
  type BrowserAttachmentBlobStore,
} from '@/base/just-vibes/browser-attachment-blob-store';
import { NativeImageTools } from './plugins/imageTools';
import { NativeAttachmentFileCache } from './plugins/attachmentFileCache';
import { NativeVideoTools } from './plugins/videoTools';
import { NativeWebDavHttp } from './plugins/webDavHttp';

type ImagePickResult = MediaResult;

export class CapacitorNativeService implements IHostService {
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  readonly _serviceBrand: undefined;
  private readonly _onBackButton = new Emitter<void>();
  public readonly onBackButton = this._onBackButton.event;
  private readonly memoryFilesystem: BrowserHostFilesystem = createMemoryHostFilesystem();
  private readonly memoryAttachmentFiles: BrowserAttachmentBlobStore =
    createBrowserAttachmentBlobStore(true);

  constructor(
    private readonly useMemoryFilesystem = false,
    private readonly testInjectionService?: ITestInjectionService,
  ) {
    if (!this.isNative) return;
    void import('@capacitor/app').then(({ App }) => {
      void App.addListener('backButton', () => this._onBackButton.fire());
    });
  }

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  exitApp(): void {
    if (!this.isNative) return;
    void import('@capacitor/app').then(({ App }) => App.exitApp());
  }

  vibrateShort(): void {
    navigator.vibrate?.(12);
  }

  async authenticateBiometric(options: HostBiometricOptions): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      const available = await NativeBiometric.isAvailable();
      if (!available.isAvailable) return false;
      await NativeBiometric.verifyIdentity({
        reason: options.reason ?? '',
        title: options.title,
        subtitle: options.subtitle,
      });
      return true;
    } catch {
      return false;
    }
  }

  caniuse(feature: HostFeature): boolean {
    // 内存模式下附件读写走内存 store，而原生附件缓存写在持久文件系统里，两者不是同一个库。
    // 若继续声明支持该能力，上传视频时会跳过本地写入，导致 getFileUrl 读内存 store 拿不到原片。
    if (this.useMemoryFilesystem && feature === 'attachmentFileCache') return false;
    return caniuseHostFeature(feature);
  }

  async writeToClipboard(text: string): Promise<void> {
    if (this.isNative) {
      await Clipboard.write({ string: text });
      return;
    }
    await writeBrowserClipboardText(text);
  }

  async setBarStyle(theme: HostSystemBarStyle): Promise<void> {
    if (!this.isNative) return;
    await SystemBars.setStyle({
      style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  }

  async pickImageBlob(source: ImagePickSource): Promise<Blob | undefined> {
    try {
      const injected = await this.testInjectionService?.get<Blob>('host.pickImageBlob');
      const blob = injected ?? (await this.pickImageBlobFromNative(source));
      if (!blob) return undefined;
      assertSupportedImage(blob);
      return blob;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isPickCancellation(message)) {
        return undefined;
      }
      throw error;
    }
  }

  async pickMediaFromGallery(options?: HostMediaPickOptions): Promise<HostGalleryPick | undefined> {
    if (!this.caniuse('videoUpload')) {
      throw new Error('Gallery media picking is not supported on this platform.');
    }
    try {
      const result = await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.All,
        allowMultipleSelection: false,
        includeMetadata: true,
        quality: 100,
        editable: 'no',
      });
      const picked = result.results[0];
      if (!picked) return undefined;
      if (picked.type === MediaType.Video) {
        const video = await toHostVideoPick(picked, options?.cacheScope);
        return { kind: 'video', video };
      }
      const blob = await readPickedImageBlob(picked);
      assertSupportedImage(blob);
      return { kind: 'image', blob };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isPickCancellation(message)) {
        return undefined;
      }
      throw error;
    }
  }

  async recordVideo(options?: HostVideoRecordOptions): Promise<HostVideoPick | undefined> {
    if (!this.caniuse('videoUpload')) {
      throw new Error('Video recording is not supported on this platform.');
    }
    try {
      const media = await Camera.recordVideo({
        includeMetadata: true,
        saveToGallery: true,
        isPersistent: true,
      });
      if (!media?.uri && !media?.webPath) return undefined;
      const video = await toHostVideoPick(media, options?.cacheScope);
      return video;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isPickCancellation(message)) {
        return undefined;
      }
      throw error;
    }
  }

  async prepareVideoUpload(
    options: HostPrepareVideoUploadOptions,
  ): Promise<HostVideoPrepareResult> {
    if (!this.caniuse('videoUpload')) {
      throw new Error('Video upload preparation is not supported on this platform.');
    }
    const outputCacheKey = this.useMemoryFilesystem ? undefined : options.cacheKey;
    const outputCacheScope = this.useMemoryFilesystem ? undefined : options.cacheScope;
    const result = await NativeVideoTools.prepareUpload({
      sourcePath: options.sourcePath,
      originalQuality: options.originalQuality ?? false,
      targetHeight: VIDEO_TARGET_HEIGHT,
      videoBitrate: VIDEO_TARGET_VIDEO_BITRATE,
      cacheKey: outputCacheKey,
      cacheScope: outputCacheScope,
    });
    try {
      const blob = await readNativeFileBlob(result.outputPath);
      return {
        blob,
        thumbnail: base64ToBlob(result.thumbnailBase64, 'image/jpeg'),
        width: result.width,
        height: result.height,
        duration: Math.round(result.durationMs / 1000),
        size: blob.size,
      };
    } finally {
      if (!outputCacheKey || !outputCacheScope) {
        await NativeVideoTools.cleanRecord({ path: result.outputPath }).catch(() => undefined);
      }
    }
  }

  async cleanVideoRecord(options: HostCleanVideoRecordOptions): Promise<void> {
    if (!this.caniuse('videoUpload')) return;
    await NativeVideoTools.cleanRecord({ path: options.sourcePath });
  }

  async writeAttachmentFile(options: HostWriteAttachmentFileOptions): Promise<void> {
    if (this.useMemoryFilesystem) {
      await this.memoryAttachmentFiles.save(options);
      return;
    }
    await NativeAttachmentFileCache.writeFile({
      scope: options.scope,
      key: options.key,
      data: await blobToBase64(options.blob),
    });
  }

  async readAttachmentFile(options: HostAttachmentFileOptions): Promise<Blob | undefined> {
    if (this.useMemoryFilesystem) {
      try {
        return await this.memoryAttachmentFiles.read(options);
      } catch {
        return undefined;
      }
    }
    try {
      const result = await NativeAttachmentFileCache.ensureCachedFile(options);
      if (!result.path) return undefined;
      const response = await fetch(Capacitor.convertFileSrc(result.path));
      if (!response.ok) return undefined;
      return await response.blob();
    } catch {
      return undefined;
    }
  }

  async getPreference<T>(key: string, schema?: ZodType<T>): Promise<T | undefined> {
    const value = (await Preferences.get({ key })).value;
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed === null) return undefined;
      if (!schema) return parsed as T;
      const result = schema.safeParse(parsed);
      return result.success ? result.data : undefined;
    } catch {
      return undefined;
    }
  }

  async savePreference<T>(key: string, value: T): Promise<T> {
    await Preferences.set({
      key,
      value: JSON.stringify(value),
    });
    return value;
  }

  async clearPreference(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async request(options: HostRequestOptions): Promise<HostResponse> {
    if (!this.caniuse('webDavHttpRequest')) {
      throw new Error('WebDAV HTTP request is not supported on this platform.');
    }
    return NativeWebDavHttp.request(options);
  }

  async generateThumbnail(
    options: HostGenerateThumbnailOptions,
  ): Promise<HostGenerateThumbnailResult> {
    if (!this.caniuse('generateThumbnail')) {
      throw new Error('Generate thumbnail is not supported on this platform.');
    }
    return NativeImageTools.generateThumbnail(options);
  }

  async readdir(options: HostFilesystemPathOptions): Promise<HostFilesystemReaddirResult> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.readdir(options);
    return Filesystem.readdir({
      path: options.path,
      directory: Directory.Data,
    });
  }

  async mkdir(options: HostFilesystemMkdirOptions): Promise<void> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.mkdir(options);
    await Filesystem.mkdir({
      path: options.path,
      directory: Directory.Data,
      recursive: options.recursive,
    });
  }

  async readFile(options: HostFilesystemReadFileOptions): Promise<HostFilesystemReadFileResult> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.readFile(options);
    const result = await Filesystem.readFile({
      path: options.path,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    if (typeof result.data !== 'string') throw new Error(`File is not text: ${options.path}`);
    return { data: result.data };
  }

  async writeFile(options: HostFilesystemWriteFileOptions): Promise<void> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.writeFile(options);
    await Filesystem.writeFile({
      path: options.path,
      data: options.data,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  }

  async rmdir(options: HostFilesystemRmdirOptions): Promise<void> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.rmdir(options);
    await Filesystem.rmdir({
      path: options.path,
      directory: Directory.Data,
      recursive: options.recursive,
    });
  }

  async deleteFile(options: HostFilesystemPathOptions): Promise<void> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.deleteFile(options);
    await Filesystem.deleteFile({
      path: options.path,
      directory: Directory.Data,
    });
  }

  async rename(options: HostFilesystemRenameOptions): Promise<void> {
    if (this.useMemoryFilesystem) return this.memoryFilesystem.rename(options);
    await Filesystem.rename({
      from: options.from,
      to: options.to,
      directory: Directory.Data,
    });
  }

  private async pickImageBlobFromNative(source: ImagePickSource): Promise<Blob | undefined> {
    const photo = await this.pickImage(source);
    return photo ? readPickedImageBlob(photo) : undefined;
  }

  private async pickImage(source: ImagePickSource): Promise<ImagePickResult | undefined> {
    if (source === ImagePickSource.Camera) {
      return Camera.takePhoto({
        quality: 100,
        editable: 'no',
        includeMetadata: true,
      });
    }
    const result = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      quality: 100,
      editable: 'no',
      includeMetadata: true,
    });
    return result.results[0];
  }
}

function caniuseHostFeature(feature: HostFeature): boolean {
  switch (feature) {
    case 'generateThumbnail':
      return Capacitor.getPlatform() === 'android';
    case 'webDavHttpRequest':
      return Capacitor.getPlatform() === 'android';
    case 'attachmentFileCache':
      return Capacitor.getPlatform() === 'android';
    case 'videoUpload':
      return Capacitor.getPlatform() === 'android';
    case 'videoTranscode':
      return Capacitor.getPlatform() === 'android';
    case 'biometric':
      return Capacitor.getPlatform() === 'android';
  }
}

async function readNativeFileBlob(path: string): Promise<Blob> {
  // 通过 WebView 文件协议读取，避免将上百 MB 的视频经 base64 往返内存。
  const response = await fetch(Capacitor.convertFileSrc(path));
  if (!response.ok) {
    throw new Error(`Local file is missing. (${response.status})`);
  }
  return response.blob();
}

function parseResolution(resolution: string | undefined): { width: number; height: number } {
  const match = resolution?.match(/^(\d+)x(\d+)$/);
  if (!match) return { width: 0, height: 0 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function toHostVideoPick(
  media: MediaResult,
  cacheScope: string | undefined,
): Promise<HostVideoPick> {
  const uri = media.uri ?? media.webPath;
  if (!uri) throw new Error('Picked video uri is missing.');
  const record = await NativeVideoTools.createRecord({ inputUri: uri, cacheScope });
  const metadataResolution = parseResolution(media.metadata?.resolution);
  const width = record.width || metadataResolution.width;
  const height = record.height || metadataResolution.height;
  return {
    sourcePath: record.sourcePath,
    webPath: Capacitor.convertFileSrc(record.sourcePath),
    thumbnail: record.thumbnailBase64
      ? `data:image/jpeg;base64,${record.thumbnailBase64}`
      : media.thumbnail
        ? `data:image/jpeg;base64,${media.thumbnail}`
        : undefined,
    mimeType: 'video/mp4',
    size: record.size || media.metadata?.size || 0,
    width,
    height,
    durationMs: record.durationMs || Math.round((media.metadata?.duration ?? 0) * 1000),
  };
}

async function readPickedImageBlob(photo: ImagePickResult): Promise<Blob> {
  if (!photo.webPath) throw new Error('Picked image path is missing.');
  const blob = await (await fetch(photo.webPath)).blob();
  return fillMissingBlobType(blob, getPickedImageMimeType(photo));
}

function getPickedImageMimeType(photo: ImagePickResult): string | undefined {
  const format = (photo as MediaResult).metadata?.format?.toLowerCase();
  if (format === 'png') return 'image/png';
  if (format === 'webp') return 'image/webp';
  if (format === 'jpg' || format === 'jpeg') return 'image/jpeg';
  return undefined;
}

function fillMissingBlobType(blob: Blob, mimeType: string | undefined): Blob {
  if (blob.type || !mimeType) return blob;
  return new Blob([blob], { type: mimeType });
}

async function writeBrowserClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand('copy');
  textarea.remove();
  if (!ok) throw new Error('Copy command failed.');
}
