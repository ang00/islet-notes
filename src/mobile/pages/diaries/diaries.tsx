import { searchNotebooks, getSortedNotebooks } from '@/core/diary/selectors';
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
import React, { useState, useMemo, useCallback } from 'react';
import { useService } from '@/hooks/use-service';
import { Search, X } from 'lucide-react';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();

  const allGroups = model.groups ?? [];
  const allTags = model.tags ?? [];

  const filteredNotebooks = useMemo(
    () => searchNotebooks(notebooks, searchQuery, groupFilter, tagFilter),
    [notebooks, searchQuery, groupFilter, tagFilter],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setGroupFilter(undefined);
    setTagFilter(undefined);
  }, []);

  const hasFilter = !!searchQuery || !!groupFilter || !!tagFilter;

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
          type: 'button',
          label: showSearch
            ? localize('common.close', 'Close')
            : localize('common.search', 'Search'),
          testId: DiaryList.sync,
          onClick: () => {
            if (showSearch) {
              clearFilters();
            }
            setShowSearch(!showSearch);
          },
        }}
      />
      <main
        className={cx(styles.Page.ContentTabbed, styles.DiaryListPage.Content)}
        data-test-id={DiaryList.content}
      >
        {showSearch && (
          <div className='sticky top-0 z-20 bg-canvas px-4 pt-2 pb-1'>
            <div className='relative'>
              <Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-placeholder' strokeWidth={1.8} />
              <input
                type='text'
                className={cx(
                  'w-full rounded-lg bg-surface py-2 pl-9 pr-8 text-ink placeholder:text-placeholder outline-none',
                  'text-[15px] font-medium leading-5',
                )}
                placeholder={localize('diary.searchNotebooks', 'Search notebooks, groups, tags...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type='button'
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-placeholder'
                  onClick={() => setSearchQuery('')}
                >
                  <X size={16} strokeWidth={1.8} />
                </button>
              )}
            </div>
            {(allGroups.length > 0 || allTags.length > 0) && (
              <div className='mt-2 flex gap-2 overflow-x-auto pb-1'>
                {allGroups.map((g) => (
                  <button
                    key={g}
                    type='button'
                    className={cx(
                      'flex-none rounded-full px-3 py-1 text-[13px] leading-5 transition',
                      groupFilter === g
                        ? 'bg-accent text-white'
                        : 'bg-surface text-muted active:bg-soft',
                    )}
                    onClick={() => setGroupFilter(groupFilter === g ? undefined : g)}
                  >
                    {g}
                  </button>
                ))}
                {allTags.map((t) => (
                  <button
                    key={t}
                    type='button'
                    className={cx(
                      'flex-none rounded-full px-3 py-1 text-[13px] leading-5 transition',
                      tagFilter === t
                        ? 'bg-accent text-white'
                        : 'bg-surface text-muted active:bg-soft',
                    )}
                    onClick={() => setTagFilter(tagFilter === t ? undefined : t)}
                  >
                    #{t}
                  </button>
                ))}
                {hasFilter && (
                  <button
                    type='button'
                    className='flex-none rounded-full bg-danger/10 px-3 py-1 text-[13px] leading-5 text-danger'
                    onClick={clearFilters}
                  >
                    {localize('common.clear', 'Clear')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div className={styles.Cell.InsetGroup} data-test-id={DiaryList.list}>
          {filteredNotebooks.length === 0 ? (
            <div className='flex min-h-[120px] items-center justify-center text-center text-muted'>
              {localize('diary.noResults', 'No results')}
            </div>
          ) : (
            filteredNotebooks.map((notebook) => (
              <NotebookRow
                key={notebook.id}
                model={model}
                notebook={notebook}
                onClick={() => navigationService.navigate({ path: `/diary/${notebook.id}` })}
              />
            ))
          )}
        </div>
      </main>
      <BottomTabBar active='diary' />
    </div>
  );
}
