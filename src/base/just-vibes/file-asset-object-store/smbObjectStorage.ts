// @islet-import-scope same-dir

import type { SMBConfigRecord } from '@/core/diary/type';
import { syncStoragePath } from '@/core/spec/syncStoragePath';
import type {
  ObjectStorage,
  ObjectStorageHostBridge,
  ObjectStorageObjectMetadata,
  ObjectStoragePutOptions,
} from './objectStorage';

export interface TestConnectionResult {
  ok: boolean;
  error?: string;
}

export type SMBConnectionConfig = Pick<SMBConfigRecord, 'host' | 'share' | 'username' | 'password' | 'domain'>;

export function createSMBObjectStorage(
  config: SMBConnectionConfig,
  hostService?: ObjectStorageHostBridge,
): ObjectStorage {
  return new SMBObjectStorage(config, hostService);
}

export async function testSMBConnection(
  config: SMBConnectionConfig & Pick<SMBConfigRecord, 'prefix'>,
  hostService?: ObjectStorageHostBridge,
): Promise<TestConnectionResult> {
  try {
    const storage = createSMBObjectStorage(config, hostService);
    const key = syncStoragePath.remote.healthcheck(config);
    await storage.putObject(key, JSON.stringify({ ok: true, at: new Date().toISOString() }), {
      contentType: 'application/json',
    });
    const payload = await storage.getObjectBytes(key);
    if (!payload) throw new Error('Healthcheck file is missing after upload.');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

class SMBObjectStorage implements ObjectStorage {
  private readonly config: SMBConnectionConfig;

  constructor(
    config: SMBConnectionConfig,
    private readonly hostService: ObjectStorageHostBridge | undefined,
  ) {
    this.config = config;
  }

  async putObject(
    key: string,
    body: Blob | Uint8Array | string,
    options: ObjectStoragePutOptions = {},
  ): Promise<void> {
    if (this.isNative()) {
      return this.nativePutObject(key, body, options);
    }
    return this.httpPutObject(key, body, options);
  }

  async getObjectBytes(key: string): Promise<Uint8Array | undefined> {
    if (this.isNative()) {
      return this.nativeGetObjectBytes(key);
    }
    return this.httpGetObjectBytes(key);
  }

  async getObjectBlob(key: string): Promise<Blob | undefined> {
    if (this.isNative()) {
      return this.nativeGetObjectBlob(key);
    }
    return this.httpGetObjectBlob(key);
  }

  async headObject(key: string): Promise<ObjectStorageObjectMetadata | undefined> {
    if (this.isNative()) {
      return this.nativeHeadObject(key);
    }
    return this.httpHeadObject(key);
  }

  private isNative(): boolean {
    return this.hostService?.caniuse('webDavHttpRequest') === true;
  }

  private async nativePutObject(
    key: string,
    body: Blob | Uint8Array | string,
    _options: ObjectStoragePutOptions,
  ): Promise<void> {
    const { NativeSmb } = await import('@/services/native/capacitor/plugins/smb');
    const bodyBase64 = await bodyToBase64(
      body instanceof Blob ? new Uint8Array(await body.arrayBuffer()) : body,
    );
    await NativeSmb.putObject({
      host: this.config.host,
      share: this.config.share,
      username: this.config.username,
      password: this.config.password,
      domain: this.config.domain,
      key,
      body: bodyBase64,
    });
  }

  private async nativeGetObjectBlob(key: string): Promise<Blob | undefined> {
    const { NativeSmb } = await import('@/services/native/capacitor/plugins/smb');
    const result = await NativeSmb.getObject({
      host: this.config.host,
      share: this.config.share,
      username: this.config.username,
      password: this.config.password,
      domain: this.config.domain,
      key,
    });
    if (result.status === 404) return undefined;
    if (!isOkStatus(result.status)) {
      throw new Error(`GET ${key} failed with ${result.status}`);
    }
    const binary = atob(result.body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes]);
  }

  private async nativeGetObjectBytes(key: string): Promise<Uint8Array | undefined> {
    const blob = await this.nativeGetObjectBlob(key);
    return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
  }

  private async nativeHeadObject(key: string): Promise<ObjectStorageObjectMetadata | undefined> {
    const { NativeSmb } = await import('@/services/native/capacitor/plugins/smb');
    const result = await NativeSmb.headObject({
      host: this.config.host,
      share: this.config.share,
      username: this.config.username,
      password: this.config.password,
      domain: this.config.domain,
      key,
    });
    if (result.status === 404) return undefined;
    if (!isOkStatus(result.status)) return undefined;
    return {
      contentLength: result.contentLength,
      lastModified: result.lastModified ? new Date(result.lastModified) : undefined,
    };
  }

  private async httpPutObject(
    key: string,
    body: Blob | Uint8Array | string,
    options: ObjectStoragePutOptions,
  ): Promise<void> {
    const payload = toRequestBody(body, options.contentType);
    const url = this.buildResourceUrl(key);
    const headers: Record<string, string> = {};
    if (options.contentType) headers['Content-Type'] = options.contentType;
    const auth = buildBasicAuth(this.config);
    if (auth) headers.Authorization = auth;

    if (this.hostService) {
      const result = await this.hostService.request({
        url,
        method: 'PUT',
        headers,
        body: payload instanceof Blob ? await bodyToBase64(payload.toString()) : payload,
      });
      if (result && !isOkStatus(result.status)) {
        throw new Error(`PUT ${key} failed with ${result.status}`);
      }
      return;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: payload,
    });
    if (!response.ok) {
      throw new Error(`PUT ${key} failed with ${response.status}`);
    }
  }

  private async httpGetObjectBlob(key: string): Promise<Blob | undefined> {
    const url = this.buildResourceUrl(key);
    const headers: Record<string, string> = {};
    const auth = buildBasicAuth(this.config);
    if (auth) headers.Authorization = auth;

    if (this.hostService) {
      const result = await this.hostService.request({
        url,
        method: 'GET',
        headers,
      });
      if (result) {
        if (result.status === 404) return undefined;
        if (!isOkStatus(result.status)) {
          throw new Error(`GET ${key} failed with ${result.status}`);
        }
        const binary = atob(result.body || '');
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return new Blob([bytes]);
      }
    }

    const response = await fetch(url, { method: 'GET', headers });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GET ${key} failed with ${response.status}`);
    return response.blob();
  }

  private async httpGetObjectBytes(key: string): Promise<Uint8Array | undefined> {
    const blob = await this.httpGetObjectBlob(key);
    return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
  }

  private async httpHeadObject(key: string): Promise<ObjectStorageObjectMetadata | undefined> {
    const url = this.buildResourceUrl(key);
    const headers: Record<string, string> = {};
    const auth = buildBasicAuth(this.config);
    if (auth) headers.Authorization = auth;

    if (this.hostService) {
      const result = await this.hostService.request({
        url,
        method: 'HEAD',
        headers,
      });
      if (result) {
        if (result.status === 404) return undefined;
        if (!isOkStatus(result.status)) return undefined;
        return {};
      }
    }

    const response = await fetch(url, { method: 'HEAD', headers });
    if (response.status === 404) return undefined;
    if (!response.ok) return undefined;
    const eTag = response.headers.get('ETag') ?? undefined;
    const lastModifiedText = response.headers.get('Last-Modified');
    const contentLengthText = response.headers.get('Content-Length');
    const lastModified = lastModifiedText ? new Date(lastModifiedText) : undefined;
    const contentLength = contentLengthText ? Number(contentLengthText) : undefined;
    return {
      eTag,
      lastModified: lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : undefined,
      contentLength: contentLength !== undefined && Number.isFinite(contentLength) ? contentLength : undefined,
    };
  }

  private buildResourceUrl(key: string): string {
    const baseUrl = this.config.host.trim().replace(/\/+$/, '');
    const encodedPath = key
      .replace(/^\/+/, '')
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${baseUrl}/${encodedPath}`;
  }
}

function isOkStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function buildBasicAuth(config: SMBConnectionConfig): string | undefined {
  const username = config.username.trim();
  if (!username) return undefined;
  return `Basic ${btoa(`${config.domain ? `${config.domain}\\` : ''}${username}:${config.password}`)}`;
}

function toRequestBody(body: Blob | Uint8Array | string, contentType?: string): Blob | string {
  if (body instanceof Uint8Array) {
    const copy = new Uint8Array(body.byteLength);
    copy.set(body);
    return new Blob([copy.buffer], { type: contentType ?? 'application/octet-stream' });
  }
  return body;
}

async function bodyToBase64(body: Blob | Uint8Array | string): Promise<string> {
  const bytes =
    body instanceof Uint8Array
      ? body
      : typeof body === 'string'
        ? new TextEncoder().encode(body)
        : new Uint8Array(await body.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + 0x8000));
  }
  return btoa(binary);
}
