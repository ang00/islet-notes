import { localize } from '@/nls';
import { HeaderPage } from '@/mobile/components/layout/HeaderPage';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { useService } from '@/hooks/use-service';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { useTextInputDialog } from '@/mobile/overlay/textInputDialog/useTextInputDialog';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { GroupTagSettings } from '@/mobile/test.id';
import { cx, styles } from '@/mobile/styles/ui';
import { Edit3, Trash2, Plus } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

export function SettingsGroupTagPage() {
  const model = useDiaryModel();
  const diaryService = useService(IDiaryService);
  const showDialog = useDialog();
  const showTextInputDialog = useTextInputDialog();
  const showSuccessToast = useSuccessToast();
  const [search, setSearch] = useState('');

  const groups = model.groups ?? [];
  const tags = model.tags ?? [];

  const filteredGroups = useMemo(
    () => (search ? groups.filter((g) => g.toLowerCase().includes(search.toLowerCase())) : groups),
    [groups, search],
  );
  const filteredTags = useMemo(
    () => (search ? tags.filter((t) => t.toLowerCase().includes(search.toLowerCase())) : tags),
    [tags, search],
  );

  const handleAddGroup = useCallback(() => {
    showTextInputDialog({
      title: localize('settings.addGroup', 'Add group'),
      value: '',
      placeholder: localize('diary.groupNamePlaceholder', 'Group name'),
      saveLabel: localize('common.save', 'Save'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onSave: (value) => {
        if (value.trim()) {
          diaryService.addGroup(value.trim());
          showSuccessToast({ message: localize('common.saved', 'Saved') });
        }
      },
    });
  }, [diaryService, showTextInputDialog, showSuccessToast]);

  const handleEditGroup = useCallback(
    (oldName: string) => {
      showTextInputDialog({
        title: localize('settings.editGroup', 'Edit group'),
        value: oldName,
        placeholder: localize('diary.groupNamePlaceholder', 'Group name'),
        saveLabel: localize('common.save', 'Save'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        onSave: (value) => {
          if (value.trim() && value.trim() !== oldName) {
            diaryService.renameGroup(oldName, value.trim());
            showSuccessToast({ message: localize('common.saved', 'Saved') });
          }
        },
      });
    },
    [diaryService, showTextInputDialog, showSuccessToast],
  );

  const handleDeleteGroup = useCallback(
    (name: string) => {
      showDialog({
        message: localize('settings.deleteGroupConfirm', 'Delete this group?'),
        confirmLabel: localize('common.delete', 'Delete'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        tone: 'danger',
        onConfirm: () => {
          diaryService.deleteGroup(name);
          showSuccessToast({ message: localize('common.deleted', 'Deleted') });
        },
      });
    },
    [diaryService, showDialog, showSuccessToast],
  );

  const handleAddTag = useCallback(() => {
    showTextInputDialog({
      title: localize('settings.addTag', 'Add tag'),
      value: '',
      placeholder: localize('diary.tagPlaceholder', 'Enter tags'),
      saveLabel: localize('common.save', 'Save'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onSave: (value) => {
        if (value.trim()) {
          diaryService.addTag(value.trim());
          showSuccessToast({ message: localize('common.saved', 'Saved') });
        }
      },
    });
  }, [diaryService, showTextInputDialog, showSuccessToast]);

  const handleEditTag = useCallback(
    (oldName: string) => {
      showTextInputDialog({
        title: localize('settings.editTag', 'Edit tag'),
        value: oldName,
        placeholder: localize('diary.tagPlaceholder', 'Enter tags'),
        saveLabel: localize('common.save', 'Save'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        onSave: (value) => {
          if (value.trim() && value.trim() !== oldName) {
            diaryService.renameTag(oldName, value.trim());
            showSuccessToast({ message: localize('common.saved', 'Saved') });
          }
        },
      });
    },
    [diaryService, showTextInputDialog, showSuccessToast],
  );

  const handleDeleteTag = useCallback(
    (name: string) => {
      showDialog({
        message: localize('settings.deleteTagConfirm', 'Delete this tag?'),
        confirmLabel: localize('common.delete', 'Delete'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        tone: 'danger',
        onConfirm: () => {
          diaryService.deleteTag(name);
          showSuccessToast({ message: localize('common.deleted', 'Deleted') });
        },
      });
    },
    [diaryService, showDialog, showSuccessToast],
  );

  const renderItem = (
    name: string,
    onEdit: () => void,
    onDelete: () => void,
  ) => (
    <div
      key={name}
      className='flex min-h-[52px] items-center gap-3 border-b border-line px-4 last:border-b-0'
    >
      <span className='min-w-0 flex-1 text-[17px] font-medium leading-6 text-ink'>{name}</span>
      <button
        type='button'
        className='flex h-8 w-8 items-center justify-center rounded text-muted transition active:bg-soft'
        onClick={onEdit}
      >
        <Edit3 size={18} strokeWidth={1.8} />
      </button>
      <button
        type='button'
        className='flex h-8 w-8 items-center justify-center rounded text-danger transition active:bg-soft'
        data-test-id={GroupTagSettings.delete}
        onClick={onDelete}
      >
        <Trash2 size={18} strokeWidth={1.8} />
      </button>
    </div>
  );

  return (
    <HeaderPage
      pageTestId={GroupTagSettings.page}
      contentTestId={GroupTagSettings.content}
      header={{
        title: localize('settings.groupTagManagement', 'Groups & Tags'),
        showBack: true,
        right: {
          type: 'icon',
          icon: 'plus',
          label: localize('common.add', 'Add'),
          testId: GroupTagSettings.add,
          onClick: handleAddGroup,
        },
      }}
    >
      <div className='px-4 pt-3 pb-2'>
        <input
          type='text'
          className={cx(
            'w-full rounded-lg bg-surface px-3 py-2 text-ink placeholder:text-placeholder outline-none',
            'text-[13px] leading-5',
          )}
          placeholder={localize('settings.searchGroupsTags', 'Search groups and tags')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-test-id={GroupTagSettings.search}
        />
      </div>

      <div className={cx(styles.Cell.InsetGroup, 'mx-4')}>
        <div className='flex items-center justify-between px-4 py-2.5'>
          <span className='text-[13px] leading-5 text-muted'>
            {localize('settings.groups', 'Groups')}
          </span>
          <button
            type='button'
            className='flex h-7 w-7 items-center justify-center rounded text-accent transition active:bg-soft'
            onClick={handleAddGroup}
          >
            <Plus size={18} strokeWidth={1.8} />
          </button>
        </div>
        {filteredGroups.length === 0 ? (
          <div className='px-4 pb-3 text-center text-[13px] leading-5 text-muted'>
            {localize('settings.noGroups', 'No groups')}
          </div>
        ) : (
          filteredGroups.map((name) =>
            renderItem(
              name,
              () => handleEditGroup(name),
              () => handleDeleteGroup(name),
            ),
          )
        )}
      </div>

      <div className={cx(styles.Cell.InsetGroup, 'mx-4 mt-3')}>
        <div className='flex items-center justify-between px-4 py-2.5'>
          <span className='text-[13px] leading-5 text-muted'>
            {localize('settings.tags', 'Tags')}
          </span>
          <button
            type='button'
            className='flex h-7 w-7 items-center justify-center rounded text-accent transition active:bg-soft'
            onClick={handleAddTag}
          >
            <Plus size={18} strokeWidth={1.8} />
          </button>
        </div>
        {filteredTags.length === 0 ? (
          <div className='px-4 pb-3 text-center text-[13px] leading-5 text-muted'>
            {localize('settings.noTags', 'No tags')}
          </div>
        ) : (
          filteredTags.map((name) =>
            renderItem(
              name,
              () => handleEditTag(name),
              () => handleDeleteTag(name),
            ),
          )
        )}
      </div>
    </HeaderPage>
  );
}
