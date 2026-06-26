import {
  AttachmentRecord,
  CreateAttachmentEntryOptions,
  CreateTextEntryOptions,
  DiaryEntryRecord,
  DiaryModelData,
} from '@/core/diary/type';
import { Event } from 'vscf/base/common/event';
import { createDecorator } from 'vscf/platform/instantiation/common';

export interface IDiaryService {
  readonly _serviceBrand: undefined;
  readonly onStateChange: Event<void>;
  readonly onSyncStateChange: Event<void>;
  initStorageScope(scopeId: string): Promise<void>;
  initializeStorageScopeFromSnapshot(scopeId: string, snapshot: Uint8Array): Promise<void>;
  readonly modelState: DiaryModelData;
  readonly initialized: boolean;
  readonly isSyncing: boolean;
  setIgnoreDatabaseSync(ignore: boolean): void;
  syncNow(): Promise<void>;
  addNotebook(name: string): string;
  softDeleteNotebook(notebookId: string): void;
  pinNotebook(notebookId: string): void;
  unpinNotebook(notebookId: string): void;
  updateNotebookName(notebookId: string, name: string): void;
  updateNotebookAvatar(notebookId: string, avatarAttachmentId: string | undefined): void;
  updateProfileName(name: string): void;
  updateProfileAvatar(avatarAttachmentId: string | undefined): void;
  addTextEntry(notebookId: string, text: string): string;
  addTextEntryWithOptions(options: CreateTextEntryOptions): string;
  addTextEntriesWithOptions(optionsList: CreateTextEntryOptions[]): string[];
  addEntryForTest(entry: DiaryEntryRecord): string;
  updateTextEntry(entryId: string, text: string): void;
  addAttachmentEntry(options: CreateAttachmentEntryOptions): string;
  updateAttachmentEntryText(entryId: string, text: string | undefined): void;
  moveEntryToNotebook(entryId: string, targetNotebookId: string): void;
  addAttachment(attachment: AttachmentRecord): void;
  softDeleteEntry(entryId: string): void;
  addGroup(name: string): void;
  renameGroup(oldName: string, newName: string): void;
  deleteGroup(name: string): void;
  addTag(name: string): void;
  renameTag(oldName: string, newName: string): void;
  deleteTag(name: string): void;
  setNotebookGroup(notebookId: string, group: string | undefined): void;
  setNotebookTags(notebookId: string, tags: string[]): void;
}

export const IDiaryService = createDecorator<IDiaryService>('IDiaryService');
