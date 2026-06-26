import { useEntryHighlight } from '@/base/just-vibes/entry-highlight';
import { getDiaryChatState } from '@/core/state/chatItems';
import { useService } from '@/hooks/use-service';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { PageHeader, PageHeaderRight } from '@/mobile/components/PageHeader';
import { DiaryChatFooter } from '@/mobile/components/pages/diary-chat/chat/DiaryChatFooter';
import {
  ChatMessage,
  EntryHighlightProvider,
} from '@/mobile/components/pages/diary-chat/chat/main';
import { PinDialog } from '@/mobile/components/PinDialog/PinDialog';
import { useDiaryChatChromeHeight } from '@/mobile/hooks/pages/diary-chat/useDiaryChatChromeHeight';
import { useDiaryChatVirtualList } from '@/mobile/hooks/pages/diary-chat/useDiaryChatVirtualList';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { useUploadTasks } from '@/mobile/hooks/useUploadTasks';
import { useWindowSize } from '@/mobile/hooks/useWindowSize';
import { cx, styles } from '@/mobile/styles/ui';
import { DiaryChat } from '@/mobile/test.id';
import { localize } from '@/nls';
import { hashPin } from '@/base/crypto/pin';
import { isUnlockedInSession, unlockNotebookSession } from '@/base/common/sessionUnlock';
import { IHostService } from '@/services/native/common/hostService';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import { ISpeechRecognitionService } from '@/services/speechRecognition/common/speechRecognitionService';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { VariableSizeList } from 'react-window';

export function DiaryChatPage() {
  const { notebookId } = useParams();
  const [searchParams] = useSearchParams();
  const targetEntryId = searchParams.get('targetEntryId') ?? undefined;
  const model = useDiaryModel();
  const navigationService = useService(INavigationService);
  const hostService = useService(IHostService);
  const speechRecognitionService = useService(ISpeechRecognitionService);
  useWatchEvent(speechRecognitionService.onDidChangeTranscribing);
  const transcribingVersion = speechRecognitionService.getTranscribingVersion();
  const isTranscribing = useCallback(
    (entryId: string) => speechRecognitionService.isTranscribing(entryId),
    [speechRecognitionService],
  );
  const size = useWindowSize();
  const tasks = useUploadTasks(notebookId);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const chromeHeight = useDiaryChatChromeHeight({
    headerRef,
    footerRef,
  });

  const headerProps: PageHeaderRight = {
    type: 'icon',
    icon: 'ellipsis',
    label: localize('diary.settings', 'Notebook settings'),
    testId: DiaryChat.settings,
    onClick: () => navigationService.navigate({ path: `/diary/${notebookId}/settings` }),
  };

  const { notebook, chatItems, previewAttachments } = useMemo(
    () => getDiaryChatState(model, notebookId, tasks),
    [model, notebookId, tasks],
  );

  // 定位到目标消息后将其点亮一次;状态会在动画结束后自动清除,可重复触发。
  const { highlightedEntryId, triggerHighlight } = useEntryHighlight();
  useEffect(() => {
    if (targetEntryId) triggerHighlight(targetEntryId);
  }, [targetEntryId, triggerHighlight]);
  const listHeight = Math.max(1, Math.floor(size.height - chromeHeight));
  const { itemKey, itemSize, listRef } = useDiaryChatVirtualList({
    chatItems,
    model,
    notebookId,
    targetEntryId,
    viewportWidth: size.width,
    isTranscribing,
    transcribingVersion,
  });

  if (!notebook || !notebookId) return <Navigate to='/diaries' replace />;
  if (notebook.lockedAt && !isUnlockedInSession(notebookId)) {
    return (
      <PinDialog
        title={localize('settings.enterPin', 'Enter PIN')}
        onConfirm={async (pin) => {
          const storedHash = await hostService.getPreference<string>('islet.pinHash');
          if (storedHash && (await hashPin(pin)) === storedHash) {
            unlockNotebookSession(notebookId!);
            return true;
          }
          return false;
        }}
        onCancel={() => navigationService.navigate({ path: '/diaries' })}
      />
    );
  }

  return (
    <div
      className={cx(styles.Page.Root, styles.DiaryChatPage.RootChat)}
      data-test-id={DiaryChat.page}
    >
      <div ref={headerRef}>
        <PageHeader title={notebook.name} showBack right={headerProps} />
      </div>
      <main
        className={styles.DiaryChatPage.Main}
        data-test-id={DiaryChat.list}
        style={{ height: listHeight }}
      >
        {chatItems.length === 0 ? (
          <div className={styles.DiaryChatPage.Empty} data-test-id={DiaryChat.empty}>
            {localize('diary.chat.empty', 'No entries yet')}
          </div>
        ) : (
          <EntryHighlightProvider highlightedEntryId={highlightedEntryId}>
            <VariableSizeList
              ref={listRef}
              height={listHeight}
              width='100%'
              itemCount={chatItems.length}
              itemSize={itemSize}
              itemKey={itemKey}
              itemData={{ items: chatItems, model, previewAttachments }}
            >
              {ChatMessage}
            </VariableSizeList>
          </EntryHighlightProvider>
        )}
      </main>
      <DiaryChatFooter ref={footerRef} notebookId={notebookId} />
    </div>
  );
}
