// @islet-import-scope same-dir

import { testS3Connection } from './s3ObjectStorage';
import type { TestConnectionResult } from './s3ObjectStorage';
import { testWebDAVConnection } from './webdavObjectStorage';
import { testSMBConnection } from './smbObjectStorage';
import type { EditableUploadConfig, UploadConfig } from './uploadConfig';
import type { ObjectStorageHostBridge } from './objectStorage';

export function testUploadConnection(
  config: EditableUploadConfig | UploadConfig,
  hostService?: ObjectStorageHostBridge,
): Promise<TestConnectionResult> {
  if (config.provider === 'webdav') {
    return testWebDAVConnection(config, hostService);
  }
  if (config.provider === 'smb') {
    return testSMBConnection(config, hostService);
  }
  return testS3Connection(config);
}
