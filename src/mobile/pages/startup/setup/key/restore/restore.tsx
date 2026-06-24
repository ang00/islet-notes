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
import { IDiaryService } from '@/services/diary/common/diaryService';
import { deriveRecoveryKeyHash } from '@/base/just-vibes/attachment-encryption';
import {
  verifyExistingSync,
  type EditableUploadConfig,
} from '@/base/just-vibes/file-asset-object-store';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { IHostService } from '@/services/native/common/hostService';
import { getAppStorageScopeKey } from '@/services/preferences/common/appPreferences';
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

export type RecoveryKeySetupForm = { recoveryKey: string };
interface SetupRouteState {
  mode?: 'auto' | 'import';
  channel?: 's3' | 'webdav' | 'smb';
  uploadConfig?: EditableUploadConfig;
}

export function StartupSetupKeyRestorePage() {
  const fileAssetService = useService(IFileAssetService);
  const diaryService = useService(IDiaryService);
  const hostService = useService(IHostService);
  const showLoadingToast = useLoadingToast();
  const showTopTips = useTopTips();
  const location = useLocation();
  const routeState = getRouteState(location.state);
  const [testing, setTesting] = useState(false);
  const importKeyForm = useForm<RecoveryKeySetupForm>({
    fields: [
      {
        name: 'recoveryKey',
        label: localize('settings.sync.key.importLabel', 'Recovery key'),
        testId: CloudSync.previousKeyInput,
        type: 'password',
        placeholder: 'k7Qx-9mWp-...',
      },
    ],
  });
  const uploadConfig = routeState?.uploadConfig;
  const channel = routeState?.channel;
  const importKey = importKeyForm.values.recoveryKey;

  if (routeState?.mode !== 'import' || !channel || !uploadConfig) {
    return <Navigate to='/' replace />;
  }

  const proceed = async () => {
    const savedRecoveryKey = importKey.trim();
    if (testing) return;
    if (!savedRecoveryKey) {
      const message = localize('settings.sync.key.empty', 'Paste the recovery key first.');
      importKeyForm.setError('recoveryKey', message);
      return;
    }
    importKeyForm.clearErrors();

    const loadingToast = showLoadingToast();
    setTesting(true);
    const verified = await verifyExistingSync(uploadConfig, savedRecoveryKey, hostService).finally(
      () => {
        loadingToast.dispose();
        setTesting(false);
      },
    );
    if (!verified.ok || !verified.snapshot) {
      showTopTips({
        message: localize(
          'settings.sync.importFailed',
          'Could not connect to the existing sync. Check the storage settings and recovery key, then try again.',
        ),
        testId: CloudSync.status,
      });
      return;
    }

    const recoveryKeyHash = await deriveRecoveryKeyHash(savedRecoveryKey);
    const configWithRecoveryKey = {
      ...uploadConfig,
      recoveryKey: savedRecoveryKey,
      recoveryKeyHash,
    };
    const saved = await fileAssetService.saveSyncConfig(configWithRecoveryKey);
    if (saved) {
      const scopeId = await getAppStorageScopeKey('persistent', saved);
      if (scopeId) {
        await diaryService.initializeStorageScopeFromSnapshot(scopeId, verified.snapshot);
      }
    }
    window.location.replace('/');
  };

  return (
    <HeaderLayoutPage
      rootClassName={styles.Page.SurfaceRoot}
      contentClassName={styles.S3SettingsPage.SetupContent}
      pageTestId={CloudSync.page}
      contentTestId={CloudSync.setupContent}
      header={{ tone: 'surface', showBack: true, right: { type: 'steps', total: 2, current: 2 } }}
    >
      <FormPage
        title={localize('settings.sync.key.title', 'Set recovery key')}
        description={localize(
          'settings.sync.key.desc',
          'This recovery key encrypts databases and attachments synced to cloud storage. Local data is not encrypted.',
        )}
        testId={CloudSync.keyCard}
        actions={[
          {
            label: testing
              ? localize('settings.sync.s3.testingShort', 'Connecting...')
              : localize('common.done', 'Done'),
            testId: CloudSync.primaryAction,
            disabled: testing,
            onClick: () => void proceed(),
          },
        ]}
      >
        <FormGroup items={importKeyForm.fields} />
      </FormPage>
    </HeaderLayoutPage>
  );
}

function getRouteState(state: unknown): SetupRouteState | undefined {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return undefined;
  const value = state as {
    mode?: unknown;
    channel?: unknown;
    uploadConfig?: unknown;
  };
  if (value.mode !== 'import') return undefined;
  if (value.channel !== 's3' && value.channel !== 'webdav' && value.channel !== 'smb') return undefined;
  if (!isUploadConfig(value.uploadConfig)) return undefined;
  return {
    mode: 'import',
    channel: value.channel,
    uploadConfig: value.uploadConfig,
  };
}

function isUploadConfig(value: unknown): value is EditableUploadConfig {
  if (!value || typeof value !== 'object') return false;
  const provider = (value as { provider?: unknown }).provider;
  return provider === 's3' || provider === 'webdav' || provider === 'smb';
}
