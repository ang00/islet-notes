import { SyncConfigRecord } from '@/core/diary/type';
import { normalizeUploadPrefix } from '@/core/spec/syncStoragePathUtils';
import { LOCAL_DIARY_SCOPE_ID } from '@/services/diary/common/storage';
import { deriveRecoveryKeyHash } from '@/base/just-vibes/attachment-encryption';
import { z } from 'zod';

export const SYNC_CONFIG_KEY = 'cloud-sync';
export const MEMORY_STORAGE_SCOPE_KEY = 'memory';

export type AppStorageMode = 'persistent' | 'memory';

export const SyncConfigSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('s3'),
    endpoint: z.string(),
    region: z.string(),
    bucket: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    prefix: z.string(),
    forcePathStyle: z.boolean(),
    recoveryKey: z.string().optional(),
    recoveryKeyHash: z.string().optional(),
    updatedAt: z.number(),
  }),
  z.object({
    provider: z.literal('webdav'),
    url: z.string(),
    username: z.string(),
    password: z.string(),
    prefix: z.string(),
    recoveryKey: z.string().optional(),
    recoveryKeyHash: z.string().optional(),
    updatedAt: z.number(),
  }),
  z.object({
    provider: z.literal('smb'),
    host: z.string(),
    share: z.string(),
    username: z.string(),
    password: z.string(),
    domain: z.string(),
    prefix: z.string(),
    recoveryKey: z.string().optional(),
    recoveryKeyHash: z.string().optional(),
    updatedAt: z.number(),
  }),
]);

export function createSyncConfigPreference(
  config: Omit<SyncConfigRecord, 'updatedAt'> | SyncConfigRecord,
): SyncConfigRecord {
  return {
    ...config,
    updatedAt: Date.now(),
  } as SyncConfigRecord;
}

export function stringifySyncConfigPreference(config: SyncConfigRecord): string {
  return JSON.stringify(config);
}

export async function getAppStorageScopeKey(
  mode: AppStorageMode,
  config: SyncConfigRecord | undefined,
): Promise<string> {
  if (mode === 'memory') return MEMORY_STORAGE_SCOPE_KEY;
  if (!config) return LOCAL_DIARY_SCOPE_ID;
  const scope = await getSyncStorageScope(config);
  return scope ? `sync-${scope}` : LOCAL_DIARY_SCOPE_ID;
}

export async function getSyncStorageScope(config: SyncConfigRecord): Promise<string | undefined> {
  const recoveryKeyHash = await getRecoveryKeyHash(config);
  if (!recoveryKeyHash) return undefined;

  const identity = JSON.stringify([
    config.provider,
    ...getRemoteIdentity(config),
    normalizeUploadPrefix(config.prefix),
    recoveryKeyHash.trim().toLowerCase(),
  ]);
  return (await sha256Hex(identity)).slice(0, 32);
}

function getRemoteIdentity(config: SyncConfigRecord): string[] {
  if (config.provider === 'webdav') {
    return [normalizeRemoteUrl(config.url)];
  }
  if (config.provider === 'smb') {
    return [normalizeRemoteUrl(config.host), config.share.trim()];
  }
  return [normalizeRemoteUrl(config.endpoint), config.bucket.trim()];
}

function normalizeRemoteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    url.hash = '';
    url.search = '';
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

async function getRecoveryKeyHash(config: SyncConfigRecord): Promise<string | undefined> {
  const savedHash = config.recoveryKeyHash?.trim();
  if (savedHash) return savedHash;

  const recoveryKey = config.recoveryKey?.trim();
  if (!recoveryKey) return undefined;
  return deriveRecoveryKeyHash(recoveryKey);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
