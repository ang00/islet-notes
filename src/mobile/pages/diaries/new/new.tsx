import { useActionSheet } from '@/mobile/overlay/actionSheet/useActionSheet';
import { TagSelector } from '@/mobile/components/TagSelector/TagSelector';
import { CellListRows } from '@/mobile/components/CellList/CellListRows';
import { localize } from '@/nls';
import { HeaderPage } from '@/mobile/components/layout/HeaderPage';
import { TextInputRow } from '@/mobile/components/TextInputRow';
import { DiaryCreate } from '@/mobile/test.id';
import { useService } from '@/hooks/use-service';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { useTextInputDialog } from '@/mobile/overlay/textInputDialog/useTextInputDialog';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import React, { useState, useCallback } from 'react';

export function DiariesNewPage() {
  const diaryService = useService(IDiaryService);
  const navigationService = useService(INavigationService);
  const model = useDiaryModel();
  const showActionSheet = useActionSheet();
  const showTextInputDialog = useTextInputDialog();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const id = diaryService.addNotebook(name.trim());
    if (group) diaryService.setNotebookGroup(id, group);
    if (tags.length > 0) diaryService.setNotebookTags(id, tags);
    navigationService.navigate({ path: `/diary/${id}`, replace: true });
  };

  const openGroupPicker = useCallback(() => {
    const allGroups = model.groups ?? [];
    const currentGroup = group;

    const actions: { id: string; label: string; tone?: 'default' | 'danger'; run: () => void }[] = allGroups.map((g) => ({
      id: g,
      label: g === currentGroup ? `✓ ${g}` : g,
      run: () => setGroup(g),
    }));

    if (currentGroup) {
      actions.unshift({
        id: 'remove-group',
        label: localize('settings.removeGroup', 'Remove group'),
        tone: 'danger',
        run: () => setGroup(undefined),
      });
    }

    showActionSheet({
      title: localize('diary.addGroup', 'Group'),
      actions,
      cancelLabel: localize('common.cancel', 'Cancel'),
    });
  }, [showActionSheet, group, model.groups]);

  const handleTagSelectorSave = useCallback((selected: string[]) => {
    setTags(selected);
    setShowTagSelector(false);
  }, []);

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
        setTags((prev) => (prev.includes(name) ? prev : [...prev, name]));
      },
    });
  }, [showTextInputDialog, diaryService]);

  return (
    <HeaderPage
      pageTestId={DiaryCreate.page}
      contentTestId={DiaryCreate.content}
      header={{
        title: localize('diary.create', 'New notebook'),
        showBack: true,
        right: {
          type: 'button',
          label: localize('common.save', 'Save'),
          disabled: !canSave,
          testId: DiaryCreate.save,
          onClick: save,
        },
      }}
    >
      <TextInputRow
        id='notebookName'
        testId={DiaryCreate.nameInput}
        autoFocus
        placeholder={localize('diary.name', 'Notebook name')}
        value={name}
        onChange={setName}
      />
      <div className='mt-6'>
        <CellListRows
          items={[
            {
              key: 'group',
              label: group ?? localize('diary.addGroup', 'Group'),
              right: group ? { type: 'value', text: group } : undefined,
              onClick: openGroupPicker,
            },
            {
              key: 'tags',
              label: tags.length > 0 ? tags.join(', ') : localize('diary.tag', 'Tag'),
              onClick: () => setShowTagSelector(true),
            },
          ]}
        />
      </div>
      {showTagSelector && (
        <TagSelector
          allTags={model.tags ?? []}
          selectedTags={tags}
          onSave={handleTagSelectorSave}
          onAddNew={handleAddNewTag}
          onCancel={() => setShowTagSelector(false)}
        />
      )}
    </HeaderPage>
  );
}
