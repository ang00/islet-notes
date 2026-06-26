import { getSortedNotebooks } from '@/core/diary/selectors';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { localize } from '@/nls';
import { BottomTabBar } from '@/mobile/components/BottomTabBar';
import { NotebookRow } from '@/mobile/components/pages/diaries/NotebookRow';
import { PageHeader } from '@/mobile/components/PageHeader';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { DiaryList } from '@/mobile/test.id';
import { cx, styles } from '@/mobile/styles/ui';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import React from 'react';
import { useService } from '@/hooks/use-service';

export function DiariesPage() {
  const model = useDiaryModel();
  const navigationService = useService(INavigationService);
  const diaryService = useService(IDiaryService);
  const fileAssetService = useService(IFileAssetService);
  useWatchEvent(diaryService.onSyncStateChange);
  useWatchEvent(fileAssetService.onDidChangeConfig);
  const notebooks = getSortedNotebooks(model);
  const syncEnabled = !!fileAssetService.getSyncConfig()?.recoveryKey;
  const isSyncing = diaryService.isSyncing;

  return (
    <div className={styles.Page.Root} data-test-id={DiaryList.page}>
      <PageHeader
        title={localize('diary.notebooks', 'Diaries')}
        left={{
          type: 'icon',
          icon: 'refresh',
          label: localize('common.sync', 'Sync'),
          hide: !syncEnabled,
          loading: isSyncing,
          testId: DiaryList.sync,
          onClick: () => void diaryService.syncNow(),
        }}
        right={{
          type: 'icon',
          icon: 'plus',
          label: localize('diary.addNotebook', 'New notebook'),
          testId: DiaryList.addNotebook,
          onClick: () => navigationService.navigate({ path: '/diaries/new' }),
        }}
      />
      <main
        className={cx(styles.Page.ContentTabbed, styles.DiaryListPage.Content)}
        data-test-id={DiaryList.content}
      >
        <div className={styles.Cell.InsetGroup} data-test-id={DiaryList.list}>
          {notebooks.map((notebook) => (
            <NotebookRow
              key={notebook.id}
              model={model}
              notebook={notebook}
              onClick={() => navigationService.navigate({ path: `/diary/${notebook.id}` })}
            />
          ))}
        </div>
      </main>
      <BottomTabBar active='diary' />
    </div>
  );
}
