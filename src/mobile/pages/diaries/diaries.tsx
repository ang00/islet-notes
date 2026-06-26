import { searchNotebooks, getSortedNotebooks } from '@/core/diary/selectors';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { localize } from '@/nls';
import { BottomTabBar } from '@/mobile/components/BottomTabBar';
import { NotebookRow } from '@/mobile/components/pages/diaries/NotebookRow';
import { PageHeader } from '@/mobile/components/PageHeader';
import { PinDialog } from '@/mobile/components/PinDialog/PinDialog';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { DiaryList } from '@/mobile/test.id';
import { cx, styles } from '@/mobile/styles/ui';
import { hashPin } from '@/base/crypto/pin';
import { unlockNotebookSession } from '@/base/common/sessionUnlock';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { IHostService } from '@/services/native/common/hostService';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useService } from '@/hooks/use-service';
import { Search, X, ChevronRight } from 'lucide-react';
import type { NotebookRecord } from '@/core/diary/type';

const PIN_PREF_KEY = 'islet.pinHash';
const PULL_THRESHOLD = 50;

export function DiariesPage() {
  const model = useDiaryModel();
  const navigationService = useService(INavigationService);
  const diaryService = useService(IDiaryService);
  const fileAssetService = useService(IFileAssetService);
  const hostService = useService(IHostService);
  useWatchEvent(diaryService.onSyncStateChange);
  useWatchEvent(fileAssetService.onDidChangeConfig);
  const notebooks = getSortedNotebooks(model);
  const syncEnabled = !!fileAssetService.getSyncConfig()?.recoveryKey;
  const isSyncing = diaryService.isSyncing;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pinNotebookId, setPinNotebookId] = useState<string | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const pullStartRef = useRef(0);
  const pullingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const isSearching = showSearch && hasFilter;

  const openSearch = useCallback(() => {
    setShowSearch(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    clearFilters();
    setShowSearch(false);
  }, [clearFilters]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (showSearch) return;
      const main = mainRef.current;
      if (!main || main.scrollTop > 0) return;
      pullingRef.current = true;
      pullStartRef.current = e.touches[0].clientY;
    },
    [showSearch],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pullingRef.current) return;
      const delta = e.touches[0].clientY - pullStartRef.current;
      if (delta > PULL_THRESHOLD) {
        pullingRef.current = false;
        openSearch();
      }
    },
    [openSearch],
  );

  const handleTouchEnd = useCallback(() => {
    pullingRef.current = false;
  }, []);

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const handleNotebookClick = useCallback(
    (notebook: NotebookRecord) => {
      if (!notebook.lockedAt) {
        navigationService.navigate({ path: `/diary/${notebook.id}` });
        return;
      }
      hostService.getPreference<string>(PIN_PREF_KEY).then((storedHash) => {
        if (!storedHash) {
          navigationService.navigate({ path: `/diary/${notebook.id}` });
          return;
        }
        setPinNotebookId(notebook.id);
      });
    },
    [navigationService, hostService],
  );

  const handlePinConfirm = useCallback(
    async (pin: string): Promise<boolean> => {
      const notebookId = pinNotebookId;
      if (!notebookId) return false;
      const storedHash = await hostService.getPreference<string>(PIN_PREF_KEY);
      if (!storedHash) {
        setPinNotebookId(null);
        navigationService.navigate({ path: `/diary/${notebookId}` });
        return true;
      }
      const inputHash = await hashPin(pin);
      if (inputHash === storedHash) {
        unlockNotebookSession(notebookId);
        setPinNotebookId(null);
        navigationService.navigate({ path: `/diary/${notebookId}` });
        return true;
      }
      return false;
    },
    [pinNotebookId, hostService, navigationService],
  );

  const groupedNotebooks = useMemo(() => {
    if (isSearching) return null;
    const groups = new Map<string, NotebookRecord[]>();
    const ungrouped: NotebookRecord[] = [];
    for (const nb of filteredNotebooks) {
      if (nb.group) {
        const list = groups.get(nb.group);
        if (list) {
          list.push(nb);
        } else {
          groups.set(nb.group, [nb]);
        }
      } else {
        ungrouped.push(nb);
      }
    }
    return { groups, ungrouped };
  }, [filteredNotebooks, isSearching]);

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
        right={showSearch ? {
          type: 'button',
          label: localize('common.cancel', 'Cancel'),
          onClick: closeSearch,
        } : undefined}
      />
      <main
        ref={mainRef}
        className={cx(styles.Page.ContentTabbed, styles.DiaryListPage.Content)}
        data-test-id={DiaryList.content}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cx(
            'overflow-hidden transition-all duration-300 ease-out',
            showSearch ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className='px-4 pt-2 pb-1'>
            <div className='relative'>
              <Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-placeholder' strokeWidth={1.8} />
              <input
                ref={searchInputRef}
                type='text'
                className={cx(
                  'w-full rounded-lg bg-surface py-2 pl-9 pr-8 text-ink placeholder:text-placeholder outline-none',
                  'text-[15px] font-medium leading-5',
                )}
                placeholder={localize('diary.searchNotebooks', 'Search notebooks, groups, tags...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>
        {!showSearch && (
          <div
            className='flex cursor-pointer justify-center pt-0.5 pb-0'
            onTouchStart={(e) => {
              // Let the main handler manage pull, but also allow tap to open
              e.stopPropagation();
            }}
            onClick={openSearch}
          >
            <div className='h-1 w-8 rounded-full bg-border' />
          </div>
        )}
        <div className={cx(isSearching ? '' : 'flex flex-col gap-3')} data-test-id={DiaryList.list}>
          {filteredNotebooks.length === 0 ? (
            <div className='flex min-h-[120px] items-center justify-center text-center text-muted'>
              {localize('diary.noResults', 'No results')}
            </div>
          ) : isSearching || !groupedNotebooks ? (
            <div className={styles.Cell.InsetGroup}>
              {filteredNotebooks.map((notebook) => (
                <NotebookRow
                  key={notebook.id}
                  model={model}
                  notebook={notebook}
                  onClick={() => handleNotebookClick(notebook)}
                />
              ))}
            </div>
          ) : (
            <>
              {[...groupedNotebooks.groups.entries()].map(([groupName, groupNotebooks]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                return (
                  <div key={groupName} className={styles.Cell.InsetGroup}>
                    <button
                      type='button'
                      className='flex w-full items-center gap-2 px-4 py-3 text-left active:bg-soft'
                      onClick={() => toggleGroup(groupName)}
                    >
                      <ChevronRight
                        size={16}
                        strokeWidth={2}
                        className={cx(
                          'flex-none text-muted transition-transform duration-200',
                          isCollapsed ? '' : 'rotate-90',
                        )}
                      />
                      <span className='flex-1 text-[15px] font-medium leading-5 text-ink'>{groupName}</span>
                      <span className='text-[13px] leading-5 text-muted'>{groupNotebooks.length}</span>
                    </button>
                    {!isCollapsed && groupNotebooks.map((notebook) => (
                      <NotebookRow
                        key={notebook.id}
                        model={model}
                        notebook={notebook}
                        onClick={() => handleNotebookClick(notebook)}
                      />
                    ))}
                  </div>
                );
              })}
              {groupedNotebooks.ungrouped.length > 0 && (
                <div className={styles.Cell.InsetGroup}>
                  {groupedNotebooks.ungrouped.map((notebook) => (
                    <NotebookRow
                      key={notebook.id}
                      model={model}
                      notebook={notebook}
                      onClick={() => handleNotebookClick(notebook)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <BottomTabBar active='diary' />
      {pinNotebookId && (
        <PinDialog
          title={localize('settings.enterPin', 'Enter PIN')}
          onConfirm={handlePinConfirm}
          onCancel={() => setPinNotebookId(null)}
        />
      )}
    </div>
  );
}
