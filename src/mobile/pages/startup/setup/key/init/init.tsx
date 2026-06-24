import { useService } from '@/hooks/use-service';
import { FormPage } from '@/mobile/components/layout/FormPage';
import { HeaderLayoutPage } from '@/mobile/components/layout/HeaderLayoutPage';
import { FormGroup } from '@/mobile/components/WeuiForm';
import { useLoadingToast } from '@/mobile/overlay/loadingToast/useLoadingToast';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { CloudSync } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import { deriveRecoveryKeyHash } from '@/base/just-vibes/attachment-encryption';
import type { EditableUploadConfig } from '@/base/just-vibes/file-asset-object-store';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { IHostService } from '@/services/native/common/hostService';
import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

interface SetupRouteState {
  mode?: 'auto' | 'import';
  channel?: 's3' | 'webdav' | 'smb';
  uploadConfig?: EditableUploadConfig;
  recoveryKey?: string;
}

export function StartupSetupKeyInitPage() {
  const fileAssetService = useService(IFileAssetService);
  const hostService = useService(IHostService);
  const showLoadingToast = useLoadingToast();
  const showSuccessToast = useSuccessToast();
  const location = useLocation();
  const routeState = getRouteState(location.state);
  const [copied, setCopied] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const uploadConfig = routeState?.uploadConfig;
  const recoveryKey = routeState?.recoveryKey;
  const channel = routeState?.channel;

  if (routeState?.mode !== 'auto' || !channel || !uploadConfig || !recoveryKey) {
    return <Navigate to='/' replace />;
  }

  const copyRecoveryKey = async () => {
    try {
      await hostService.writeToClipboard(recoveryKey);
      setCopied(true);
      showSuccessToast({
        message: localize('common.copied', 'Copied'),
        onDone: () => setCopied(false),
      });
    } catch {
      setCopied(false);
    }
  };

  const proceed = async () => {
    if (saving || !backedUp) return;
    const loadingToast = showLoadingToast();
    setSaving(true);
    try {
      const recoveryKeyHash = await deriveRecoveryKeyHash(recoveryKey);
      await fileAssetService.saveSyncConfig({
        ...uploadConfig,
        recoveryKey,
        recoveryKeyHash,
      });
      window.location.replace('/');
    } finally {
      loadingToast.dispose();
      setSaving(false);
    }
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
        check={{
          label: localize(
            'settings.sync.key.backedUp',
            'I have safely backed up this recovery key',
          ),
          checked: backedUp,
          testId: CloudSync.backedUp,
          onChange: setBackedUp,
        }}
        actions={[
          {
            label: saving
              ? localize('settings.sync.s3.testingShort', 'Connecting...')
              : localize('common.done', 'Done'),
            testId: CloudSync.primaryAction,
            disabled: saving || !backedUp,
            onClick: () => void proceed(),
          },
        ]}
      >
        <FormGroup title={localize('settings.sync.key.generated', 'New recovery key')}>
          <div className={styles.RecoveryKey.Row} data-test-id={CloudSync.generatedKey}>
            <code className={styles.S3SettingsPage.GeneratedKeyCode}>{recoveryKey}</code>
            <button
              type='button'
              className={styles.Button.Icon}
              aria-label={localize('common.copy', 'Copy')}
              onClick={() => void copyRecoveryKey()}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </FormGroup>
      </FormPage>
    </HeaderLayoutPage>
  );
}

function getRouteState(state: unknown): SetupRouteState | undefined {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return undefined;
  const value = state as {
    mode?: unknown;
    uploadConfig?: unknown;
    channel?: unknown;
    recoveryKey?: unknown;
  };
  if (value.mode !== 'auto') return undefined;
  if (value.channel !== 's3' && value.channel !== 'webdav' && value.channel !== 'smb') return undefined;
  if (!isUploadConfig(value.uploadConfig)) return undefined;
  if (typeof value.recoveryKey !== 'string' || !value.recoveryKey) return undefined;
  return {
    mode: 'auto',
    channel: value.channel,
    uploadConfig: value.uploadConfig,
    recoveryKey: value.recoveryKey,
  };
}

function isUploadConfig(value: unknown): value is EditableUploadConfig {
  if (!value || typeof value !== 'object') return false;
  const provider = (value as { provider?: unknown }).provider;
  return provider === 's3' || provider === 'webdav' || provider === 'smb';
}
