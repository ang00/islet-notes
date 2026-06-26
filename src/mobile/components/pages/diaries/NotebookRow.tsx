import { useService } from '@/hooks/use-service';
import { useLongPress } from '@/mobile/hooks/useLongPress';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { useLongPressMenu } from '@/mobile/overlay/longPressMenu/useLongPressMenu';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { useTextInputDialog } from '@/mobile/overlay/textInputDialog/useTextInputDialog';
import { IHostService } from '@/services/native/common/hostService';
import { localize } from '@/nls';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { FolderPlus, Tag } from 'lucide-react';
import React, { useRef, useCallback } from 'react';
import { SwipeableRow } from '@/mobile/components/SwipeableRow';
import { NotebookItem } from '@/mobile/components/pages/diaries/NotebookItem';
import type { DiaryModelData, NotebookRecord } from '@/core/diary/type';

interface NotebookRowProps {
  model: DiaryModelData;
  notebook: NotebookRecord;
  onClick: () => void;
}

export function NotebookRow({ model, notebook, onClick }: NotebookRowProps) {
  const diaryService = useService(IDiaryService);
  const hostService = useService(IHostService);
  const showLongPressMenu = useLongPressMenu();
  const showTextInputDialog = useTextInputDialog();
  const showSuccessToast = useSuccessToast();
  const showDialog = useDialog();
  const rowRef = useRef<HTMLDivElement>(null);

  const handlePin = useCallback(() => {
    if (notebook.pinnedAt) {
      diaryService.unpinNotebook(notebook.id);
    } else {
      diaryService.pinNotebook(notebook.id);
    }
  }, [diaryService, notebook.id, notebook.pinnedAt]);

  const handleDelete = useCallback(() => {
    showDialog({
      message: localize(
        'diary.deleteNotebookConfirm',
        'Delete this notebook? Entries in it will also be removed.',
      ),
      confirmLabel: localize('common.delete', 'Delete'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onConfirm: () => diaryService.softDeleteNotebook(notebook.id),
    });
  }, [diaryService, notebook.id, showDialog]);

  const openMenu = useCallback(() => {
    const root = rowRef.current;
    if (!root) return;
    hostService.vibrateShort();
    showLongPressMenu({
      anchorRect: root.getBoundingClientRect(),
      actions: [
        {
          id: 'add-group',
          label: localize('diary.addGroup', 'Add group'),
          icon: FolderPlus,
          run: () => {
            showTextInputDialog({
              title: localize('diary.addGroup', 'Add group'),
              value: '',
              placeholder: localize('diary.groupNamePlaceholder', 'Group name'),
              saveLabel: localize('common.save', 'Save'),
              cancelLabel: localize('common.cancel', 'Cancel'),
              onSave: (value) => {
                if (value.trim()) {
                  showSuccessToast({ message: localize('diary.groupAdded', 'Group added') });
                }
              },
            });
          },
        },
        {
          id: 'tag',
          label: localize('diary.tag', 'Tag'),
          icon: Tag,
          run: () => {
            showTextInputDialog({
              title: localize('diary.tag', 'Tag'),
              value: '',
              placeholder: localize('diary.tagPlaceholder', 'Enter tags'),
              saveLabel: localize('common.save', 'Save'),
              cancelLabel: localize('common.cancel', 'Cancel'),
              onSave: (value) => {
                if (value.trim()) {
                  showSuccessToast({ message: localize('diary.tagsSaved', 'Tags saved') });
                }
              },
            });
          },
        },
      ],
    });
  }, [hostService, showLongPressMenu, showTextInputDialog, showSuccessToast]);

  const { longPressEvents } = useLongPress<HTMLDivElement>(openMenu);

  return (
    <div ref={rowRef} {...longPressEvents}>
      <SwipeableRow
        actions={[
          {
            label: localize(notebook.pinnedAt ? 'diary.unpin' : 'diary.pin', notebook.pinnedAt ? 'Unpin' : 'Pin'),
            color: '#6b7280',
            onClick: handlePin,
          },
          {
            label: localize('common.delete', 'Delete'),
            color: '#ef4444',
            onClick: handleDelete,
          },
        ]}
      >
        <NotebookItem model={model} notebook={notebook} onClick={onClick} />
      </SwipeableRow>
    </div>
  );
}
