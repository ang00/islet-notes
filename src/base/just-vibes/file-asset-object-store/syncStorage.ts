// @islet-import-scope same-dir

import type { ObjectStorage, ObjectStorageHostBridge } from './objectStorage';
import { createS3ObjectStorage } from './s3ObjectStorage';
import { createWebDAVObjectStorage } from './webdavObjectStorage';
import { createSMBObjectStorage } from './smbObjectStorage';
import type { UploadConfig } from './uploadConfig';

export function createSyncObjectStorage(
  config: UploadConfig,
  hostService?: ObjectStorageHostBridge,
): ObjectStorage {
  if (config.provider === 'webdav') {
    return createWebDAVObjectStorage(config, hostService);
  }
  if (config.provider === 'smb') {
    return createSMBObjectStorage(config, hostService);
  }
  return createS3ObjectStorage(config);
}
