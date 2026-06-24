// @islet-import-scope same-dir

import type { SyncConfigRecord } from '@/core/diary/type';
import { syncStoragePath } from '@/core/spec/syncStoragePath';
import {
  decryptAttachmentBlob,
  decryptDatabaseSnapshot,
  deriveRecoveryKeyHash,
  encryptAttachmentBlob,
  encryptDatabaseSnapshot,
} from '@/base/just-vibes/attachment-encryption';
import {
  type ObjectStorageHostBridge,
  type ObjectStorage,
  type ObjectStorageGetOptions,
  type ObjectStorageObjectMetadata,
} from './objectStorage';
import { createSyncObjectStorage } from './syncStorage';
import { nanoid } from 'nanoid';

export interface SyncDatabaseSnapshotOptions {
  localVersionKey?: string;
}

export interface SyncDatabaseSnapshotMergeResult {
  snapshot: Uint8Array;
  localVersionKey?: string;
}

export type SyncDatabaseSnapshotMergeReturn =
  | Uint8Array
  | SyncDatabaseSnapshotMergeResult
  | Promise<Uint8Array | SyncDatabaseSnapshotMergeResult>;

export interface FileAssetObjectStoreSyncDatabaseSnapshotOptions extends SyncDatabaseSnapshotOptions {
  beforePutDatabaseSnapshot?: (key: string, snapshot: Uint8Array) => Promise<void> | void;
}

export interface FileAssetObjectStore {
  databaseMainKey(): Promise<string>;
  databaseSnapshotKey(): Promise<string>;
  syncDatabaseSnapshot(
    localSnapshot: Uint8Array,
    mergeRemoteSnapshot: (remoteSnapshot: Uint8Array) => SyncDatabaseSnapshotMergeReturn,
    options?: FileAssetObjectStoreSyncDatabaseSnapshotOptions,
  ): Promise<Uint8Array | undefined>;
  putAttachment(key: string, blob: Blob): Promise<void>;
  getAttachment(
    key: string,
    mimeType: string,
    options?: ObjectStorageGetOptions,
  ): Promise<Blob | undefined>;
  putDatabaseSnapshot(key: string, snapshot: Uint8Array): Promise<void>;
  getDatabaseSnapshot(key: string): Promise<Uint8Array | undefined>;
  headObject(key: string): Promise<ObjectStorageObjectMetadata | undefined>;
}

type ReadySyncConfig = SyncConfigRecord & { recoveryKey: string };
type ResolvedSyncConfig = SyncConfigRecord & { recoveryKey: string; recoveryKeyHash: string };

interface DatabaseSyncState {
  localVersionKey: string;
  remoteMainETag: string;
}

interface DatabaseSnapshotStore {
  databaseMainKey(): Promise<string>;
  databaseSnapshotKey(): Promise<string>;
  putDatabaseSnapshot(key: string, snapshot: Uint8Array): Promise<void>;
  getDatabaseSnapshot(key: string): Promise<Uint8Array | undefined>;
  headObject(key: string): Promise<ObjectStorageObjectMetadata | undefined>;
}

interface MemoryObjectRecord {
  body: Blob | Uint8Array;
  version: number;
  updatedAt: number;
}

const MEMORY_DATABASE_MAIN_KEY = 'memory/main.db';

export function createFileAssetObjectStore(
  config: SyncConfigRecord | undefined,
  hostService: ObjectStorageHostBridge,
): FileAssetObjectStore {
  if (!isReadySyncConfig(config)) return new MemoryFileAssetObjectStore();
  return new RemoteFileAssetObjectStore(config, hostService);
}

class MemoryFileAssetObjectStore implements FileAssetObjectStore {
  private readonly records = new Map<string, MemoryObjectRecord>();
  private databaseSyncState: DatabaseSyncState | undefined;
  private version = 0;

  async databaseMainKey(): Promise<string> {
    return MEMORY_DATABASE_MAIN_KEY;
  }

  async databaseSnapshotKey(): Promise<string> {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    return `memory/snapshots/${day}/${timestamp}-${nanoid()}.db`;
  }

  async syncDatabaseSnapshot(
    localSnapshot: Uint8Array,
    mergeRemoteSnapshot: (remoteSnapshot: Uint8Array) => SyncDatabaseSnapshotMergeReturn,
    options: FileAssetObjectStoreSyncDatabaseSnapshotOptions = {},
  ): Promise<Uint8Array | undefined> {
    const result = await syncDatabaseSnapshotInStore(
      this,
      this.databaseSyncState,
      localSnapshot,
      mergeRemoteSnapshot,
      options,
    );
    this.databaseSyncState = result.databaseSyncState;
    return result.snapshot;
  }

  async putAttachment(key: string, blob: Blob): Promise<void> {
    this.putRecord(key, blob);
  }

  async getAttachment(key: string, mimeType: string): Promise<Blob | undefined> {
    const record = this.records.get(key);
    if (!record || !(record.body instanceof Blob)) return undefined;
    if (record.body.type === mimeType) return record.body;
    return record.body.slice(0, record.body.size, mimeType);
  }

  async putDatabaseSnapshot(key: string, snapshot: Uint8Array): Promise<void> {
    this.putRecord(key, copyBytes(snapshot));
  }

  async getDatabaseSnapshot(key: string): Promise<Uint8Array | undefined> {
    const record = this.records.get(key);
    if (!record) return undefined;
    if (record.body instanceof Blob) {
      return new Uint8Array(await record.body.arrayBuffer());
    }
    return copyBytes(record.body);
  }

  async headObject(key: string): Promise<ObjectStorageObjectMetadata | undefined> {
    const record = this.records.get(key);
    if (!record) return undefined;
    return {
      eTag: `"memory-${record.version}"`,
      lastModified: new Date(record.updatedAt),
      contentLength: record.body instanceof Blob ? record.body.size : record.body.byteLength,
    };
  }

  private putRecord(key: string, body: Blob | Uint8Array): void {
    this.version += 1;
    this.records.set(key, {
      body,
      version: this.version,
      updatedAt: Date.now(),
    });
  }
}

class RemoteFileAssetObjectStore implements FileAssetObjectStore {
  private readonly storage: ObjectStorage;
  private databaseSyncState: DatabaseSyncState | undefined;
  private configLoad: Promise<ResolvedSyncConfig> | undefined;

  constructor(
    private readonly config: ReadySyncConfig,
    hostService: ObjectStorageHostBridge,
  ) {
    this.storage = createSyncObjectStorage(config, hostService);
  }

  async databaseMainKey(): Promise<string> {
    return syncStoragePath.remote.databaseMain(await this.getConfig());
  }

  async databaseSnapshotKey(): Promise<string> {
    return syncStoragePath.remote.databaseSnapshot(await this.getConfig());
  }

  async syncDatabaseSnapshot(
    localSnapshot: Uint8Array,
    mergeRemoteSnapshot: (remoteSnapshot: Uint8Array) => SyncDatabaseSnapshotMergeReturn,
    options: FileAssetObjectStoreSyncDatabaseSnapshotOptions = {},
  ): Promise<Uint8Array | undefined> {
    const result = await syncDatabaseSnapshotInStore(
      this,
      this.databaseSyncState,
      localSnapshot,
      mergeRemoteSnapshot,
      options,
    );
    this.databaseSyncState = result.databaseSyncState;
    return result.snapshot;
  }

  async putAttachment(key: string, blob: Blob): Promise<void> {
    const config = await this.getConfig();
    const encryptedBlob = await encryptAttachmentBlob(blob, config.recoveryKey);
    await this.storage.putObject(
      syncStoragePath.remote.resolveAttachmentObjectKey(config, key),
      encryptedBlob,
      {
        contentType: 'application/octet-stream',
      },
    );
  }

  async getAttachment(
    key: string,
    mimeType: string,
    options?: ObjectStorageGetOptions,
  ): Promise<Blob | undefined> {
    const config = await this.getConfig();
    const encryptedBlob = await this.storage.getObjectBlob(
      syncStoragePath.remote.resolveAttachmentObjectKey(config, key),
      options,
    );
    if (!encryptedBlob) return undefined;
    return decryptAttachmentBlob(
      encryptedBlob,
      config.recoveryKey,
      mimeType,
      config.recoveryKeyHash,
    );
  }

  async putDatabaseSnapshot(key: string, snapshot: Uint8Array): Promise<void> {
    const config = await this.getConfig();
    const encryptedSnapshot = await encryptDatabaseSnapshot(snapshot, config.recoveryKey);
    await this.storage.putObject(key, encryptedSnapshot, {
      contentLength: encryptedSnapshot.byteLength,
      contentType: 'application/octet-stream',
    });
  }

  async getDatabaseSnapshot(key: string): Promise<Uint8Array | undefined> {
    const config = await this.getConfig();
    const payload = await this.storage.getObjectBytes(key, {
      expiresIn: 60,
    });
    if (!payload) return undefined;
    return decryptDatabaseSnapshot(payload, config.recoveryKey, config.recoveryKeyHash);
  }

  async headObject(key: string): Promise<ObjectStorageObjectMetadata | undefined> {
    return this.storage.headObject(key);
  }

  private async getConfig(): Promise<ResolvedSyncConfig> {
    this.configLoad ??= resolveSyncConfig(this.config);
    return this.configLoad;
  }
}

async function syncDatabaseSnapshotInStore(
  store: DatabaseSnapshotStore,
  currentState: DatabaseSyncState | undefined,
  localSnapshot: Uint8Array,
  mergeRemoteSnapshot: (remoteSnapshot: Uint8Array) => SyncDatabaseSnapshotMergeReturn,
  options: FileAssetObjectStoreSyncDatabaseSnapshotOptions,
): Promise<{ snapshot: Uint8Array | undefined; databaseSyncState: DatabaseSyncState | undefined }> {
  const mainKey = await store.databaseMainKey();
  const remoteMainETag = await getObjectETag(store, mainKey);
  const localVersionKey = options.localVersionKey;
  if (
    localVersionKey &&
    remoteMainETag &&
    currentState?.localVersionKey === localVersionKey &&
    currentState.remoteMainETag === remoteMainETag
  ) {
    return { snapshot: undefined, databaseSyncState: currentState };
  }

  await putDatabaseSnapshotWithHook(
    store,
    await store.databaseSnapshotKey(),
    localSnapshot,
    options,
  );

  if (localVersionKey && remoteMainETag && currentState?.remoteMainETag === remoteMainETag) {
    await putDatabaseSnapshotWithHook(store, mainKey, localSnapshot, options);
    return {
      snapshot: undefined,
      databaseSyncState: await resolveDatabaseSyncState(store, mainKey, localVersionKey),
    };
  }

  const remoteSnapshot = await store.getDatabaseSnapshot(mainKey);
  if (!remoteSnapshot) {
    await putDatabaseSnapshotWithHook(store, mainKey, localSnapshot, options);
    return {
      snapshot: undefined,
      databaseSyncState: localVersionKey
        ? await resolveDatabaseSyncState(store, mainKey, localVersionKey)
        : currentState,
    };
  }

  const mergeResult = await mergeRemoteSnapshot(remoteSnapshot);
  const { snapshot: mergedSnapshot, localVersionKey: mergedVersionKey } =
    normalizeSyncDatabaseSnapshotMergeResult(mergeResult);
  await putDatabaseSnapshotWithHook(store, mainKey, mergedSnapshot, options);
  return {
    snapshot: mergedSnapshot,
    databaseSyncState: await resolveDatabaseSyncState(
      store,
      mainKey,
      mergedVersionKey ?? localVersionKey,
    ),
  };
}

async function putDatabaseSnapshotWithHook(
  store: DatabaseSnapshotStore,
  key: string,
  snapshot: Uint8Array,
  options: FileAssetObjectStoreSyncDatabaseSnapshotOptions,
): Promise<void> {
  await options.beforePutDatabaseSnapshot?.(key, snapshot);
  await store.putDatabaseSnapshot(key, snapshot);
}

async function resolveDatabaseSyncState(
  store: DatabaseSnapshotStore,
  mainKey: string,
  localVersionKey: string | undefined,
): Promise<DatabaseSyncState | undefined> {
  if (!localVersionKey) return undefined;
  const remoteMainETag = await getObjectETag(store, mainKey);
  return remoteMainETag ? { localVersionKey, remoteMainETag } : undefined;
}

function getObjectETag(store: DatabaseSnapshotStore, key: string): Promise<string | undefined> {
  return store.headObject(key).then((metadata) => metadata?.eTag);
}

function normalizeSyncDatabaseSnapshotMergeResult(
  result: Uint8Array | SyncDatabaseSnapshotMergeResult,
): SyncDatabaseSnapshotMergeResult {
  return result instanceof Uint8Array ? { snapshot: result } : result;
}

async function resolveSyncConfig(config: ReadySyncConfig): Promise<ResolvedSyncConfig> {
  const recoveryKey = config.recoveryKey.trim();
  const recoveryKeyHash = await deriveRecoveryKeyHash(recoveryKey);
  if (config.recoveryKeyHash?.trim() && config.recoveryKeyHash.trim() !== recoveryKeyHash) {
    throw new Error('Recovery key hash does not match the saved recovery key.');
  }
  return {
    ...config,
    recoveryKey,
    recoveryKeyHash,
  };
}

function isReadySyncConfig(config: SyncConfigRecord | undefined): config is ReadySyncConfig {
  if (!config?.recoveryKey?.trim()) return false;
  if (config.provider === 'webdav') {
    return !!config.url.trim();
  }
  if (config.provider === 'smb') {
    return !!config.host.trim() && !!config.share.trim();
  }
  return !!(
    config.endpoint.trim() &&
    config.region.trim() &&
    config.bucket.trim() &&
    config.accessKeyId.trim() &&
    config.secretAccessKey.trim()
  );
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}
