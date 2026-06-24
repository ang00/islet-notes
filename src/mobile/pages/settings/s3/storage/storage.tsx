import { useService } from '@/hooks/use-service';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { FormPage } from '@/mobile/components/layout/FormPage';
import { HeaderLayoutPage } from '@/mobile/components/layout/HeaderLayoutPage';
import { FormGroup, type FormGroupItem } from '@/mobile/components/WeuiForm';
import { CloudSync } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import { syncChannelDisplayName } from '@/base/just-vibes/file-asset-object-store';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import React from 'react';
import { Navigate } from 'react-router';

export function SettingsS3StoragePage() {
  const fileAssetService = useService(IFileAssetService);
  useWatchEvent(fileAssetService.onDidChangeConfig);
  const config = fileAssetService.getSyncConfig();

  if (!config) return <Navigate to='/settings/s3' replace />;

  const items: FormGroupItem[] =
    config.provider === 'webdav'
      ? [
          {
            label: localize('settings.sync.channelLabel', 'Storage type'),
            value: syncChannelDisplayName(config.provider),
          },
          { label: 'URL', value: config.url },
          {
            label: 'Prefix',
            value: config.prefix || localize('settings.sync.none', 'None'),
          },
        ]
      : config.provider === 'smb'
        ? [
            {
              label: localize('settings.sync.channelLabel', 'Storage type'),
              value: syncChannelDisplayName(config.provider),
            },
            { label: 'Host', value: config.host },
            { label: 'Share', value: config.share },
            { label: 'Domain', value: config.domain || localize('settings.sync.none', 'None') },
            {
              label: 'Prefix',
              value: config.prefix || localize('settings.sync.none', 'None'),
            },
          ]
        : [
            {
              label: localize('settings.sync.channelLabel', 'Storage type'),
              value: syncChannelDisplayName(config.provider),
            },
            { label: 'Endpoint', value: config.endpoint },
            { label: 'Region', value: config.region },
            { label: 'Bucket', value: config.bucket },
            {
              label: 'Prefix',
              value: config.prefix || localize('settings.sync.none', 'None'),
            },
          ];

  return (
    <HeaderLayoutPage
      rootClassName={styles.Page.SurfaceRoot}
      contentClassName={styles.WeuiForm.PageMain}
      pageTestId={CloudSync.page}
      contentTestId={CloudSync.storageDetail}
      header={{ showBack: true, tone: 'surface' }}
    >
      <FormPage title={localize('settings.sync.storage.detailTitle', 'Storage details')}>
        <FormGroup title={localize('settings.sync.storage', 'Storage')} items={items} readonly />
      </FormPage>
    </HeaderLayoutPage>
  );
}
