import { getSortedNotebooks } from '@/core/diary/selectors';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { localize } from '@/nls';
import { BottomTabBar } from '@/mobile/components/BottomTabBar';
import { NotebookItem } from '@/mobile/components/pages/diaries/NotebookItem';
import { PageHeader } from '@/mobile/components/PageHeader';
import { SwipeableRow } from '@/mobile/components/SwipeableRow';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { DiaryList } from '@/mobile/test.id';
import { cx, styles } from '@/mobile/styles/ui';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import React, { useCallback } from 'react';
import { useService } from '@/hooks/use-service';

export function DiariesPage() {
  const model = useDiaryModel();
  const navigationService = useService(INavigationService);
  const diaryService = useService(IDiaryService);
  const fileAssetService = useService(IFileAssetService);
  const showDialog = useDialog();
  useWatchEvent(diaryService.onSyncStateChange);
  useWatchEvent(fileAssetService.onDidChangeConfig);
  const notebooks = getSortedNotebooks(model);
  const syncEnabled = !!fileAssetService.getSyncConfig()?.recoveryKey;
  const isSyncing = diaryService.isSyncing;

  const handleDelete = useCallback(
    (notebookId: string) => {
      showDialog({
        message: localize(
          'diary.deleteNotebookConfirm',
          'Delete this notebook? Entries in it will also be removed.',
        ),
        confirmLabel: localize('common.delete', 'Delete'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        onConfirm: () => diaryService.softDeleteNotebook(notebookId),
      });
    },
    [diaryService, showDialog],
  );

  const handlePin = useCallback(
    (notebookId: string, pinned: boolean) => {
      if (pinned) {
        diaryService.unpinNotebook(notebookId);
      } else {
        diaryService.pinNotebook(notebookId);
      }
    },
    [diaryService],
  );

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
            <SwipeableRow
              key={notebook.id}
              actions={[
                {
                  label: localize(notebook.pinnedAt ? 'diary.unpin' : 'diary.pin', notebook.pinnedAt ? 'Unpin' : 'Pin'),
                  color: '#6b7280',
                  onClick: () => handlePin(notebook.id, !!notebook.pinnedAt),
                },
                {
                  label: localize('common.delete', 'Delete'),
                  color: '#ef4444',
                  onClick: () => handleDelete(notebook.id),
                },
              ]}
            >
              <NotebookItem
                model={model}
                notebook={notebook}
                onClick={() => navigationService.navigate({ path: `/diary/${notebook.id}` })}
              />
            </SwipeableRow>
          ))}
        </div>
      </main>
      <BottomTabBar active='diary' />
    </div>
  );
}
