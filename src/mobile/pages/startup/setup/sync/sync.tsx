import { FormPage } from '@/mobile/components/layout/FormPage';
import { HeaderLayoutPage } from '@/mobile/components/layout/HeaderLayoutPage';
import { FormGroup } from '@/mobile/components/WeuiForm';
import { CloudSync } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import { Database, HardDrive, Server } from 'lucide-react';
import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

type SetupMode = 'auto' | 'import';
type Channel = 's3' | 'webdav' | 'smb';
interface SetupRouteState {
  mode?: SetupMode;
}

export function StartupSetupSyncPage() {
  const location = useLocation();
  const routeState = getRouteState(location.state);
  const navigate = useNavigate();
  const mode = routeState?.mode;
  const selectChannel = (channel: Channel) => {
    const path = channel === 's3' ? '/startup/setup/sync/s3' : channel === 'webdav' ? '/startup/setup/sync/webdav' : '/startup/setup/sync/smb';
    navigate(path, { state: { mode, channel } });
  };

  if (!isSetupMode(mode)) return <Navigate to='/' replace />;

  return (
    <HeaderLayoutPage
      rootClassName={styles.Page.SurfaceRoot}
      contentClassName={styles.S3SettingsPage.SetupContent}
      pageTestId={CloudSync.page}
      contentTestId={CloudSync.setupContent}
      header={{ tone: 'surface', showBack: true }}
    >
      <FormPage
        title={localize('settings.sync.channel.title', 'Choose storage type')}
        description={localize(
          'settings.sync.channel.desc',
          'Databases and attachments are encrypted before syncing to the selected storage.',
        )}
        testId={CloudSync.channelCard}
      >
        <FormGroup
          title={localize('settings.sync.channelLabel', 'Storage type')}
          items={[
            {
              type: 'navigation',
              icon: <Server size={26} strokeWidth={1.5} />,
              title: 'WebDAV',
              description: localize(
                'settings.sync.channel.webdavDesc',
                'Sync data through a WebDAV service such as Nextcloud.',
              ),
              testId: CloudSync.channelWebdav,
              onClick: () => selectChannel('webdav'),
            },
            {
              type: 'navigation',
              icon: <Database size={26} strokeWidth={1.5} />,
              title: 'S3',
              description: localize(
                'settings.sync.channel.s3Desc',
                'Sync data through S3 or S3-compatible object storage.',
              ),
              testId: CloudSync.channelS3,
              onClick: () => selectChannel('s3'),
            },
            {
              type: 'navigation',
              icon: <HardDrive size={26} strokeWidth={1.5} />,
              title: 'SMB',
              description: localize(
                'settings.sync.channel.smbDesc',
                'Sync data through an SMB/CIFS network share.',
              ),
              testId: CloudSync.channelSmb,
              onClick: () => selectChannel('smb'),
            },
          ]}
        />
      </FormPage>
    </HeaderLayoutPage>
  );
}

function getRouteState(state: unknown): SetupRouteState | undefined {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return undefined;
  const mode = (state as { mode?: unknown }).mode;
  if (!isSetupMode(mode)) return undefined;
  return { mode };
}

function isSetupMode(value: unknown): value is SetupMode {
  return value === 'auto' || value === 'import';
}
