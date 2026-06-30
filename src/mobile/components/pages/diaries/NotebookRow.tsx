import { useService } from '@/hooks/use-service';
import { useLongPress } from '@/mobile/hooks/useLongPress';
import { useActionSheet } from '@/mobile/overlay/actionSheet/useActionSheet';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { useLongPressMenu } from '@/mobile/overlay/longPressMenu/useLongPressMenu';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { useTextInputDialog } from '@/mobile/overlay/textInputDialog/useTextInputDialog';
import { TagSelector } from '@/mobile/components/TagSelector/TagSelector';
import { IHostService } from '@/services/native/common/hostService';
import { localize } from '@/nls';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { FolderPlus, Tag } from 'lucide-react';
import React, { useRef, useCallback, useState } from 'react';
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
  const [showTagSelector, setShowTagSelector] = useState(false);

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

  const openGroupPicker = useCallback(() => {
    const allGroups = model.groups ?? [];
    const currentGroup = notebook.group;

    if (allGroups.length === 0) {
      showTextInputDialog({
        title: localize('settings.addGroup', 'Add group'),
        value: '',
        placeholder: localize('diary.groupNamePlaceholder', 'Group name'),
        saveLabel: localize('common.save', 'Save'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        onSave: (value) => {
          const name = value.trim();
          if (!name) return;
          diaryService.addGroup(name);
          diaryService.setNotebookGroup(notebook.id, name);
          showSuccessToast({ message: localize('common.saved', 'Saved') });
        },
      });
      return;
    }

    const actions: { id: string; label: string; tone?: 'default' | 'danger'; run: () => void }[] = allGroups.map((g) => ({
      id: g,
      label: g === currentGroup ? `✓ ${g}` : g,
      run: () => {
        diaryService.setNotebookGroup(notebook.id, g);
        showSuccessToast({ message: localize('common.saved', 'Saved') });
      },
    }));

    if (currentGroup) {
      actions.unshift({
        id: 'remove-group',
        label: localize('settings.removeGroup', 'Remove group'),
        tone: 'danger',
        run: () => {
          diaryService.setNotebookGroup(notebook.id, undefined);
          showSuccessToast({ message: localize('common.saved', 'Saved') });
        },
      });
    }

    actions.push({
      id: 'add-new-group',
      label: `+ ${localize('settings.addGroup', 'Add group')}`,
      run: () => {
        showTextInputDialog({
          title: localize('settings.addGroup', 'Add group'),
          value: '',
          placeholder: localize('diary.groupNamePlaceholder', 'Group name'),
          saveLabel: localize('common.save', 'Save'),
          cancelLabel: localize('common.cancel', 'Cancel'),
          onSave: (value) => {
            const name = value.trim();
            if (!name) return;
            diaryService.addGroup(name);
            diaryService.setNotebookGroup(notebook.id, name);
            showSuccessToast({ message: localize('common.saved', 'Saved') });
          },
        });
      },
    });

    showActionSheet({
      title: localize('diary.addGroup', 'Group'),
      actions,
      cancelLabel: localize('common.cancel', 'Cancel'),
    });
  }, [diaryService, showActionSheet, showTextInputDialog, showSuccessToast, notebook.id, notebook.group, model.groups]);

  const openTagSelector = useCallback(() => {
    const allTags = model.tags ?? [];
    if (allTags.length === 0) {
      showTextInputDialog({
        title: localize('diary.tag', 'Tag'),
        value: '',
        placeholder: localize('diary.tagPlaceholder', 'Enter tags (comma separated)'),
        saveLabel: localize('common.save', 'Save'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        onSave: (value) => {
          const tags = value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          if (tags.length === 0) return;
          diaryService.setNotebookTags(notebook.id, tags);
          tags.forEach((t) => {
            if (!allTags.includes(t)) diaryService.addTag(t);
          });
          showSuccessToast({ message: localize('common.saved', 'Saved') });
        },
      });
      return;
    }
    setShowTagSelector(true);
  }, [diaryService, showTextInputDialog, showSuccessToast, notebook.id, notebook.tags, model.tags]);

  const handleTagSelectorSave = useCallback(
    (tags: string[]) => {
      diaryService.setNotebookTags(notebook.id, tags);
      showSuccessToast({ message: localize('common.saved', 'Saved') });
      setShowTagSelector(false);
    },
    [diaryService, notebook.id, showSuccessToast],
  );

  const handleAddNewTag = useCallback(() => {
    setShowTagSelector(false);
    showTextInputDialog({
      title: localize('settings.addTag', 'Add tag'),
      value: '',
      placeholder: localize('diary.tagPlaceholder', 'Tag name'),
      saveLabel: localize('common.save', 'Save'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onSave: (value) => {
        const name = value.trim();
        if (!name) return;
        diaryService.addTag(name);
        const currentTags = notebook.tags ?? [];
        if (!currentTags.includes(name)) {
          diaryService.setNotebookTags(notebook.id, [...currentTags, name]);
        }
        showSuccessToast({ message: localize('common.saved', 'Saved') });
      },
    });
  }, [diaryService, showTextInputDialog, showSuccessToast, notebook.id, notebook.tags, model.tags]);

  const openMenu = useCallback(() => {
    const root = rowRef.current;
    if (!root) return;
    hostService.vibrateShort();
    showLongPressMenu({
      anchorRect: root.getBoundingClientRect(),
      actions: [
        {
          id: 'add-group',
          label: localize('diary.addGroup', 'Group'),
          icon: FolderPlus,
          run: openGroupPicker,
        },
        {
          id: 'tag',
          label: localize('diary.tag', 'Tag'),
          icon: Tag,
          run: openTagSelector,
        },
      ],
    });
  }, [hostService, showLongPressMenu, openGroupPicker, openTagSelector]);

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
            label: localize(notebook.lockedAt ? 'diary.unlock' : 'diary.lock', notebook.lockedAt ? 'Unlock' : 'Lock'),
            color: '#f59e0b',
            onClick: () =>
              notebook.lockedAt
                ? diaryService.unlockNotebook(notebook.id)
                : diaryService.lockNotebook(notebook.id),
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
      {showTagSelector && (
        <TagSelector
          allTags={model.tags ?? []}
          selectedTags={notebook.tags ?? []}
          onSave={handleTagSelectorSave}
          onAddNew={handleAddNewTag}
          onCancel={() => setShowTagSelector(false)}
        />
      )}
    </div>
  );
}
