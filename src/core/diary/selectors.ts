import { format, isSameDay } from 'date-fns';
import { getDateFnsLocale } from '@/locales/common/locale';
import {
  AttachmentRecord,
  DiaryEntryRecord,
  DiaryModelData,
  isKnownDiaryEntryType,
  NotebookRecord,
} from './type';

export function getNotebookById(
  model: DiaryModelData,
  notebookId: string,
): NotebookRecord | undefined {
  const notebook = model.notebookMap.get(notebookId);
  return notebook?.deletedAt ? undefined : notebook;
}

export function getAttachmentById(
  model: DiaryModelData,
  attachmentId: string,
): AttachmentRecord | undefined {
  const attachment = model.attachmentMap.get(attachmentId);
  return attachment?.deletedAt ? undefined : attachment;
}

export function getProfileAvatarAttachment(model: DiaryModelData): AttachmentRecord | undefined {
  const avatarAttachmentId = model.profile.avatarAttachmentId;
  return avatarAttachmentId ? getAttachmentById(model, avatarAttachmentId) : undefined;
}

export function getEntriesByNotebook(
  model: DiaryModelData,
  notebookId: string,
): DiaryEntryRecord[] {
  return model.entries
    .filter((entry) => entry.notebookId === notebookId && !entry.deletedAt)
    .sort(compareEntries);
}

export function compareEntries(
  a: Pick<DiaryEntryRecord, 'createdAt' | 'id'>,
  b: Pick<DiaryEntryRecord, 'createdAt' | 'id'>,
) {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id.localeCompare(b.id);
}

export function getLastEntry(
  model: DiaryModelData,
  notebookId: string,
): DiaryEntryRecord | undefined {
  const entries = getEntriesByNotebook(model, notebookId);
  return entries[entries.length - 1];
}

export function getNotebookListTime(model: DiaryModelData, notebook: NotebookRecord): number {
  return getLastEntry(model, notebook.id)?.createdAt ?? notebook.createdAt;
}

export function getSortedNotebooks(model: DiaryModelData): NotebookRecord[] {
  const orderIndex = new Map(model.notebooks.map((notebook, index) => [notebook.id, index]));
  const lastEntryCreatedAtByNotebook = new Map<string, number>();

  for (const entry of model.entries) {
    if (entry.deletedAt) continue;
    const current = lastEntryCreatedAtByNotebook.get(entry.notebookId);
    if (current === undefined || entry.createdAt > current) {
      lastEntryCreatedAtByNotebook.set(entry.notebookId, entry.createdAt);
    }
  }

  return [...model.notebooks].sort((a, b) => {
    const aPinned = a.pinnedAt ? 1 : 0;
    const bPinned = b.pinnedAt ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    const aLastEntryAt = lastEntryCreatedAtByNotebook.get(a.id);
    const bLastEntryAt = lastEntryCreatedAtByNotebook.get(b.id);
    const aHasEntry = aLastEntryAt !== undefined;
    const bHasEntry = bLastEntryAt !== undefined;

    if (aLastEntryAt !== undefined && bLastEntryAt !== undefined && aLastEntryAt !== bLastEntryAt)
      return bLastEntryAt - aLastEntryAt;
    if (aHasEntry !== bHasEntry) return aHasEntry ? -1 : 1;
    if (!aHasEntry && !bHasEntry && a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;

    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  });
}

export function getEntrySummary(
  model: DiaryModelData,
  entry: DiaryEntryRecord | undefined,
): string {
  if (!entry) return '';
  if (entry.type === 'text') return entry.text ?? '';
  if (!isKnownDiaryEntryType(entry.type)) return '[Unsupported]';
  const attachment = entry.attachmentId ? getAttachmentById(model, entry.attachmentId) : undefined;
  if (attachment?.type === 'image') return '[Image]';
  if (attachment?.type === 'audio') return entry.text?.trim() || '[Voice]';
  if (attachment?.type === 'video') return '[Video]';
  return '[Attachment]';
}

export function shouldShowTimeDivider(
  previous: DiaryEntryRecord | undefined,
  current: DiaryEntryRecord,
): boolean {
  if (!previous) return true;
  return current.createdAt - previous.createdAt > 10 * 60 * 1000;
}

export function formatEntryTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const locale = getDateFnsLocale();
  if (isSameDay(date, now)) {
    return format(date, 'HH:mm', { locale });
  }
  return format(date, 'yyyy-MM-dd HH:mm', { locale });
}

export function searchNotebooks(
  notebooks: NotebookRecord[],
  query: string,
  groupFilter?: string,
  tagFilter?: string,
): NotebookRecord[] {
  return notebooks.filter((n) => {
    if (groupFilter && n.group !== groupFilter) return false;
    if (tagFilter && !n.tags?.includes(tagFilter)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    if (n.name.toLowerCase().includes(q)) return true;
    if (n.group?.toLowerCase().includes(q)) return true;
    if (n.tags?.some((t) => t.toLowerCase().includes(q))) return true;
    return false;
  });
}
