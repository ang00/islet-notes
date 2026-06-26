import { useService } from '@/hooks/use-service';
import { useLongPress } from '@/mobile/hooks/useLongPress';
import { useActionSheet } from '@/mobile/overlay/actionSheet/useActionSheet';
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
  const showActionSheet = useActionSheet();
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
            const availableGroups = model.groups ?? [];
            const currentGroup = notebook.group;
            const actions = availableGroups
              .filter((g) => g !== currentGroup)
              .map((g) => ({
                id: g,
                label: g,
                run: () => {
                  diaryService.setNotebookGroup(notebook.id, g);
                  showSuccessToast({ message: localize('common.saved', 'Saved') });
                },
              }));
            if (currentGroup) {
              actions.unshift({
                id: 'remove-group',
                label: localize('settings.removeGroup', 'Remove group'),
                run: () => {
                  diaryService.setNotebookGroup(notebook.id, undefined);
                  showSuccessToast({ message: localize('common.saved', 'Saved') });
                },
              });
            }
            showActionSheet({
              title: localize('diary.addGroup', 'Add group'),
              actions,
              cancelLabel: localize('common.cancel', 'Cancel'),
            });
          },
        },
        {
          id: 'tag',
          label: localize('diary.tag', 'Tag'),
          icon: Tag,
          run: () => {
            const currentTags = notebook.tags?.join(', ') ?? '';
            showTextInputDialog({
              title: localize('diary.tag', 'Tag'),
              value: currentTags,
              placeholder: localize('diary.tagPlaceholder', 'Enter tags (comma separated)'),
              saveLabel: localize('common.save', 'Save'),
              cancelLabel: localize('common.cancel', 'Cancel'),
              onSave: (value) => {
                const tags = value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean);
                diaryService.setNotebookTags(notebook.id, tags);
                if (tags.length > 0) {
                  tags.forEach((t) => {
                    const allTags = model.tags ?? [];
                    if (!allTags.includes(t)) {
                      diaryService.addTag(t);
                    }
                  });
                }
                showSuccessToast({ message: localize('common.saved', 'Saved') });
              },
            });
          },
        },
      ],
    });
  }, [
    hostService,
    showLongPressMenu,
    showActionSheet,
    showTextInputDialog,
    showSuccessToast,
    diaryService,
    notebook.id,
    notebook.group,
    notebook.tags,
    model.groups,
    model.tags,
  ]);

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
