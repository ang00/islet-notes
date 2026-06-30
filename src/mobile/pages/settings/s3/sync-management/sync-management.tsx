import { SyncConfigRecord } from '@/core/diary/type';
import { useService } from '@/hooks/use-service';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { CellListGroup, type CellListItem } from '@/mobile/components/CellList';
import { PageHeader } from '@/mobile/components/PageHeader';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { CloudSync } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { syncChannelDisplayName } from '@/base/just-vibes/file-asset-object-store';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import React, { useEffect, useState } from 'react';

export function SyncManagementPage({ config }: { config: SyncConfigRecord }) {
  const model = useDiaryModel();
  const navigationService = useService(INavigationService);
  const diaryService = useService(IDiaryService);
  useWatchEvent(diaryService.onSyncStateChange);
  const [lastSyncTime, setLastSyncTime] = useState<number | undefined>();

  useEffect(() => {
    diaryService.getLastSyncTime().then(setLastSyncTime);
  }, [diaryService, diaryService.isSyncing]);

  return (
    <>
      <PageHeader title={localize('settings.sync.title', 'Cloud Sync')} showBack />
      <main
        className={styles.S3SettingsPage.ManagementContent}
        data-test-id={CloudSync.managementContent}
      >
        <CellListGroup
          title={localize('settings.sync.storage', 'Storage')}
          bordered
          testId={CloudSync.storageGroup}
          className={styles.S3SettingsPage.Group}
          items={[
            {
              label: syncChannelDisplayName(config.provider),
              right: {
                type: 'value',
                text: config.provider === 'webdav' ? config.url : config.provider === 'smb' ? `${config.host}/${config.share}` : config.bucket,
              },
              testId: CloudSync.storageSummary,
              onClick: () => navigationService.navigate({ path: '/settings/s3/storage' }),
            },
            {
              label: localize('settings.sync.lastSync', 'Last sync'),
              right: {
                type: 'value' as const,
                text: lastSyncTime ? formatRelativeTime(lastSyncTime) : localize('settings.sync.notYet', 'Not yet'),
              },
            },
          ]}
        />

        <CellListGroup
          title={localize('settings.sync.content', 'Sync content')}
          bordered
          testId={CloudSync.syncContentGroup}
          className={styles.S3SettingsPage.Group}
          items={buildSyncContentItems(model)}
        />

        <CellListGroup
          bordered
          className={styles.Common.SectionGap}
          items={[
            {
              type: 'action',
              danger: true,
              label: localize('settings.sync.turnOff', 'Turn off sync'),
              testId: CloudSync.deleteSync,
              onClick: () => navigationService.navigate({ path: '/settings/s3/delete' }),
            },
          ]}
        />
      </main>
    </>
  );
}

function buildSyncContentItems(model: ReturnType<typeof useDiaryModel>): CellListItem[] {
  const liveEntries = model.entries.filter((entry) => !entry.deletedAt);
  const liveAttachments = model.attachments.filter((attachment) => !attachment.deletedAt);
  const databaseBytes = new TextEncoder().encode(
    JSON.stringify({
      version: model.version,
      profile: model.profile,
      notebooks: model.notebooks,
      entries: liveEntries,
      attachments: liveAttachments,
    }),
  ).byteLength;
  const attachmentBytes = liveAttachments.reduce((total, attachment) => total + attachment.size, 0);

  return [
    {
      label: localize('settings.sync.database', 'Database'),
      right: {
        type: 'value',
        text: localize(
          'settings.sync.databaseStats',
          '{0} entries · {1}',
          liveEntries.length,
          formatBytes(databaseBytes),
        ),
      },
    },
    {
      label: localize('settings.sync.attachments', 'Attachments'),
      right: {
        type: 'value',
        text: localize(
          'settings.sync.attachmentsStats',
          '{0} files · {1}',
          liveAttachments.length,
          formatBytes(attachmentBytes),
        ),
      },
    },
  ];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(globalThis.language || undefined, { maximumFractionDigits: value >= 10 ? 1 : 2 }).format(value)} ${units[unitIndex]}`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(globalThis.language || undefined, { numeric: 'auto' });

  if (seconds < 60) return localize('settings.sync.justNow', 'Just now');
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (hours < 24) return rtf.format(-hours, 'hour');
  if (days < 30) return rtf.format(-days, 'day');

  return new Intl.DateTimeFormat(globalThis.language || undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
