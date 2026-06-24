import { useService } from '@/hooks/use-service';
import { FormPage } from '@/mobile/components/layout/FormPage';
import { HeaderLayoutPage } from '@/mobile/components/layout/HeaderLayoutPage';
import { FormGroup } from '@/mobile/components/WeuiForm';
import { useForm } from '@/mobile/hooks/useForm';
import { useLoadingToast } from '@/mobile/overlay/loadingToast/useLoadingToast';
import { useTopTips } from '@/mobile/overlay/topTips/useTopTips';
import { CloudSync } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import {
  emptySMBConfig,
  testUploadConnection,
  type EditableSMBConfig,
} from '@/base/just-vibes/file-asset-object-store';
import { IHostService } from '@/services/native/common/hostService';
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

type SetupMode = 'auto' | 'import';
interface SetupRouteState {
  mode?: SetupMode;
  channel?: 's3' | 'webdav' | 'smb';
  uploadConfig?: EditableSMBConfig;
}

export function StartupSetupSyncSmbPage() {
  const location = useLocation();
  const routeState = getRouteState(location.state);
  const navigate = useNavigate();
  const showLoadingToast = useLoadingToast();
  const showTopTips = useTopTips();
  const hostService = useService(IHostService);
  const [testing, setTesting] = useState(false);
  const initialValues = routeState?.uploadConfig ?? emptySMBConfig();
  const smbForm = useForm<EditableSMBConfig>({
    initialValues,
    requiredMessage: (field) =>
      localize('settings.sync.s3.required', '{0} is required.', field.label),
    fields: [
      {
        name: 'host',
        label: 'Host',
        testId: CloudSync.smbHostInput,
        placeholder: 'https://nas.example.com:8443',
        required: true,
      },
      {
        name: 'share',
        label: 'Share',
        testId: CloudSync.smbShareInput,
        placeholder: 'share-name',
        required: true,
      },
      {
        name: 'username',
        label: 'Username',
        testId: CloudSync.smbUsernameInput,
        placeholder: 'username',
      },
      {
        name: 'password',
        label: localize('settings.sync.smb.password', 'Password'),
        testId: CloudSync.smbPasswordInput,
        type: 'password',
        placeholder: '********',
      },
      {
        name: 'domain',
        label: localize('settings.sync.smb.domain', 'Domain / Workgroup'),
        testId: CloudSync.smbDomainInput,
        placeholder: 'WORKGROUP',
      },
      {
        name: 'prefix',
        label: 'Prefix',
        testId: CloudSync.smbPrefixInput,
        placeholder: 'chat-diary',
      },
    ],
  });
  const mode = routeState?.mode;

  if (!isSetupMode(mode) || routeState?.channel !== 'smb') {
    return <Navigate to='/' replace />;
  }

  const proceed = async () => {
    if (testing || !smbForm.verify()) return;
    const loadingToast = showLoadingToast();
    setTesting(true);
    const result = await testUploadConnection(smbForm.values, hostService).finally(() => {
      loadingToast.dispose();
      setTesting(false);
    });
    if (!result.ok) {
      showTopTips({
        message: localize(
          'settings.sync.s3.testFailed',
          'Connection test failed: {0}',
          result.error,
        ),
        testId: CloudSync.status,
      });
      return;
    }
    const path = mode === 'auto' ? '/startup/setup/key/init' : '/startup/setup/key/restore';
    navigate(path, {
      state: {
        mode,
        channel: 'smb',
        uploadConfig: smbForm.values,
        recoveryKey: mode === 'auto' ? generateRecoveryKey() : undefined,
      },
    });
  };
  return (
    <HeaderLayoutPage
      rootClassName={styles.Page.SurfaceRoot}
      contentClassName={styles.S3SettingsPage.SetupContent}
      pageTestId={CloudSync.page}
      contentTestId={CloudSync.setupContent}
      header={{ tone: 'surface', showBack: true, right: { type: 'steps', total: 2, current: 1 } }}
    >
      <FormPage
        title={localize('settings.sync.smb.title', 'Configure SMB storage')}
        description={localize(
          'settings.sync.s3.desc',
          'Data is encrypted on this device before syncing to your storage.',
        )}
        testId={CloudSync.smbCard}
        actions={[
          {
            label: testing
              ? localize('settings.sync.s3.testingShort', 'Connecting...')
              : localize('common.next', 'Next'),
            testId: CloudSync.primaryAction,
            disabled: testing,
            onClick: () => void proceed(),
          },
        ]}
      >
        <FormGroup title={localize('settings.sync.storage', 'Storage')} items={smbForm.fields} />
      </FormPage>
    </HeaderLayoutPage>
  );
}

function getRouteState(state: unknown): SetupRouteState | undefined {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return undefined;
  const value = state as { mode?: unknown; channel?: unknown; uploadConfig?: unknown };
  if (!isSetupMode(value.mode)) return undefined;
  if (value.channel !== 'smb') return undefined;
  return {
    mode: value.mode,
    channel: 'smb',
    uploadConfig: isSMBConfig(value.uploadConfig) ? value.uploadConfig : undefined,
  };
}

function isSetupMode(value: unknown): value is SetupMode {
  return value === 'auto' || value === 'import';
}

function isSMBConfig(value: unknown): value is EditableSMBConfig {
  return (
    !!value && typeof value === 'object' && (value as { provider?: unknown }).provider === 'smb'
  );
}

function generateRecoveryKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return chars.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}
