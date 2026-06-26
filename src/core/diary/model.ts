import { localize } from '@/nls';
import { nanoid } from 'nanoid';
import { Emitter } from 'vscf/base/common/event';
import { loadLoro, type LoroDoc, type LoroMap, type LoroMovableList, type PeerID } from './loro';
import {
  AttachmentRecord,
  CreateAttachmentEntryOptions,
  CreateTextEntryOptions,
  DiaryEntryRecord,
  DiaryModelData,
  NotebookRecord,
  ProfileRecord,
} from './type';

const PROFILE = 'profile';
const NOTEBOOK_ORDER = 'notebookOrder';
const NOTEBOOKS = 'notebooks';
const ENTRIES = 'entries';
const ATTACHMENTS = 'attachments';
const GROUPS = 'groups';
const TAGS = 'tags';

export class DiaryModel {
  private readonly _onModelChange = new Emitter<void>();
  public readonly onModelChange = this._onModelChange.event;

  static async create(): Promise<DiaryModel> {
    const { LoroDoc } = await loadLoro();
    return new DiaryModel(new LoroDoc());
  }

  private constructor(private readonly doc: LoroDoc) {
    this.doc.subscribeLocalUpdates(() => {
      this._onModelChange.fire();
    });
  }

  import(data: Array<Uint8Array>) {
    data.forEach((item) => this.doc.import(item));
  }

  export() {
    return this.doc.export({ mode: 'snapshot' });
  }

  getVersionKey(): string {
    return JSON.stringify(
      Object.entries(this.getVersion()).sort(([left], [right]) => left.localeCompare(right)),
    );
  }

  ensureDefaultNotebook() {
    const notebooks = this.listNotebooks();
    if (notebooks.length > 0) return notebooks[0].id;
    return this.addNotebook(localize('diary.defaultNotebookName', 'My diary'));
  }

  addNotebook(name: string, createdAt = Date.now()): string {
    const id = nanoid();
    const record: NotebookRecord = {
      id,
      name,
      createdAt,
      updatedAt: createdAt,
    };
    this.notebooksMap.set(id, record);
    this.notebookOrder.push(id);
    this.doc.commit();
    return id;
  }

  updateNotebookName(notebookId: string, name: string) {
    const existing = this.getNotebook(notebookId);
    if (!existing) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      name,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  updateNotebookAvatar(notebookId: string, avatarAttachmentId: string | undefined) {
    const existing = this.getNotebook(notebookId);
    if (!existing) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      avatarAttachmentId,
      updatedAt: Date.now(),
    });

    this.doc.commit();
  }

  updateProfileName(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    this.profileMap.set('name', trimmedName);
    this.profileMap.set('updatedAt', Date.now());
    this.doc.commit();
  }

  updateProfileAvatar(avatarAttachmentId: string | undefined) {
    this.profileMap.set('avatarAttachmentId', avatarAttachmentId ?? '');
    this.profileMap.set('updatedAt', Date.now());
    this.doc.commit();
  }

  softDeleteNotebook(notebookId: string) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  pinNotebook(notebookId: string) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      pinnedAt: Date.now(),
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  unpinNotebook(notebookId: string) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      pinnedAt: undefined,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  lockNotebook(notebookId: string) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      lockedAt: Date.now(),
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  unlockNotebook(notebookId: string) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      lockedAt: undefined,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  setNotebookGroup(notebookId: string, group: string | undefined) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      group: group || undefined,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  setNotebookTags(notebookId: string, tags: string[]) {
    const existing = this.getNotebook(notebookId);
    if (!existing || existing.deletedAt) return;
    this.notebooksMap.set(notebookId, {
      ...existing,
      tags: tags.length > 0 ? tags : undefined,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  addGroup(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = this.groupsList.toArray() as string[];
    if (existing.includes(trimmed)) return;
    this.groupsList.push(trimmed);
    this.doc.commit();
  }

  renameGroup(oldName: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    const list = this.groupsList;
    const arr = list.toArray() as string[];
    const idx = arr.indexOf(oldName);
    if (idx === -1) return;
    list.set(idx, trimmed);
    this.doc.commit();
  }

  deleteGroup(name: string): void {
    const list = this.groupsList;
    const arr = list.toArray() as string[];
    const idx = arr.indexOf(name);
    if (idx === -1) return;
    list.delete(idx, 1);
    this.doc.commit();
  }

  addTag(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = this.tagsList.toArray() as string[];
    if (existing.includes(trimmed)) return;
    this.tagsList.push(trimmed);
    this.doc.commit();
  }

  renameTag(oldName: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    const list = this.tagsList;
    const arr = list.toArray() as string[];
    const idx = arr.indexOf(oldName);
    if (idx === -1) return;
    list.set(idx, trimmed);
    this.doc.commit();
  }

  deleteTag(name: string): void {
    const list = this.tagsList;
    const arr = list.toArray() as string[];
    const idx = arr.indexOf(name);
    if (idx === -1) return;
    list.delete(idx, 1);
    this.doc.commit();
  }

  addTextEntry(options: CreateTextEntryOptions): string {
    const now = options.createdAt ?? Date.now();
    const id = nanoid();

    const entry: DiaryEntryRecord = {
      id,
      notebookId: options.notebookId,
      type: 'text',
      text: options.text,
      createdAt: now,
      updatedAt: now,
      externalSource: options.externalSource,
      externalId: options.externalId,
    };
    this.entriesMap.set(id, entry);
    this.touchNotebook(options.notebookId, now);
    this.doc.commit();
    return id;
  }

  addTextEntries(optionsList: CreateTextEntryOptions[]): string[] {
    const ids: string[] = [];
    const touchedNotebooks = new Map<string, number>();

    for (const options of optionsList) {
      const now = options.createdAt ?? Date.now();
      const id = nanoid();
      const entry: DiaryEntryRecord = {
        id,
        notebookId: options.notebookId,
        type: 'text',
        text: options.text,
        createdAt: now,
        updatedAt: now,
        externalSource: options.externalSource,
        externalId: options.externalId,
      };
      this.entriesMap.set(id, entry);
      ids.push(id);
      touchedNotebooks.set(
        options.notebookId,
        Math.max(touchedNotebooks.get(options.notebookId) ?? 0, now),
      );
    }

    for (const [notebookId, updatedAt] of touchedNotebooks) {
      this.touchNotebook(notebookId, updatedAt);
    }
    this.doc.commit();
    return ids;
  }

  addEntryForTest(entry: DiaryEntryRecord): string {
    this.entriesMap.set(entry.id, entry);
    this.touchNotebook(entry.notebookId, entry.updatedAt);
    this.doc.commit();
    return entry.id;
  }

  updateTextEntry(entryId: string, text: string) {
    const existing = this.getEntry(entryId);
    if (!existing || existing.type !== 'text' || existing.deletedAt) return;
    this.entriesMap.set(entryId, {
      ...existing,
      text,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  addAttachmentEntry(options: CreateAttachmentEntryOptions): string {
    const entryId = nanoid();
    const entry: DiaryEntryRecord = {
      id: entryId,
      notebookId: options.attachment.notebookId,
      type: 'attachment',
      text: options.text,
      attachmentId: options.attachment.id,
      createdAt: options.createdAt,
      updatedAt: options.createdAt,
      externalSource: options.externalSource,
      externalId: options.externalId,
    };
    this.attachmentsMap.set(options.attachment.id, options.attachment);
    this.entriesMap.set(entryId, entry);
    this.touchNotebook(options.attachment.notebookId, options.createdAt);
    this.doc.commit();
    return entryId;
  }

  updateAttachmentEntryText(entryId: string, text: string | undefined) {
    const existing = this.getEntry(entryId);
    if (!existing || existing.type !== 'attachment' || existing.deletedAt) return;
    const nextText = text?.trim() ? text : undefined;
    this.entriesMap.set(entryId, {
      ...existing,
      text: nextText,
      updatedAt: Date.now(),
    });
    this.doc.commit();
  }

  moveEntryToNotebook(entryId: string, targetNotebookId: string) {
    const existing = this.getEntry(entryId);
    const targetNotebook = this.getNotebook(targetNotebookId);
    if (!existing || existing.deletedAt || !targetNotebook || targetNotebook.deletedAt) return;
    if (existing.notebookId === targetNotebookId) return;

    const now = Date.now();
    this.entriesMap.set(entryId, {
      ...existing,
      notebookId: targetNotebookId,
      updatedAt: now,
    });

    if (existing.attachmentId) {
      const attachment = this.getAttachment(existing.attachmentId);
      if (attachment && !attachment.deletedAt) {
        this.attachmentsMap.set(existing.attachmentId, {
          ...attachment,
          notebookId: targetNotebookId,
        });
      }
    }

    this.touchNotebook(existing.notebookId, now);
    this.touchNotebook(targetNotebookId, now);
    this.doc.commit();
  }

  addAttachment(attachment: AttachmentRecord) {
    this.attachmentsMap.set(attachment.id, attachment);
    this.doc.commit();
  }

  softDeleteEntry(entryId: string) {
    const existing = this.getEntry(entryId);
    if (!existing || existing.deletedAt) return;
    this.entriesMap.set(entryId, {
      ...existing,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (existing.attachmentId) {
      this.softDeleteAttachment(existing.attachmentId, false);
    }
    this.doc.commit();
  }

  softDeleteAttachment(attachmentId: string, shouldCommit = true) {
    const existing = this.getAttachment(attachmentId);
    if (!existing || existing.deletedAt) return;
    this.attachmentsMap.set(attachmentId, {
      ...existing,
      deletedAt: Date.now(),
    });
    if (shouldCommit) this.doc.commit();
  }

  toJSON(): DiaryModelData {
    const notebooksRecord = this.notebooksMap.toJSON() as Record<string, NotebookRecord>;
    const entriesRecord = this.entriesMap.toJSON() as Record<string, DiaryEntryRecord>;
    const attachmentsRecord = this.attachmentsMap.toJSON() as Record<string, AttachmentRecord>;
    const notebookOrder = this.notebookOrder.toArray() as string[];
    const orderedIds = [
      ...notebookOrder,
      ...Object.keys(notebooksRecord).filter((id) => !notebookOrder.includes(id)),
    ];
    const notebooks = orderedIds
      .map((id) => notebooksRecord[id])
      .filter((notebook): notebook is NotebookRecord => !!notebook && !notebook.deletedAt);
    const entries = Object.values(entriesRecord);
    const attachments = Object.values(attachmentsRecord);
    const profile = this.readProfile();
    return {
      version: this.getVersion(),
      profile,
      notebookOrder: orderedIds,
      notebooks,
      notebookMap: new Map(Object.entries(notebooksRecord)),
      entries,
      entryMap: new Map(Object.entries(entriesRecord)),
      attachments,
      attachmentMap: new Map(Object.entries(attachmentsRecord)),
      groups: this.groupsList.toArray() as string[],
      tags: this.tagsList.toArray() as string[],
    };
  }

  private getVersion(): Record<PeerID, number> {
    const version: Record<PeerID, number> = {};
    this.doc
      .version()
      .toJSON()
      .forEach((value, peerId) => {
        version[peerId] = value;
      });
    return version;
  }

  private listNotebooks(): NotebookRecord[] {
    return this.toJSON().notebooks;
  }

  private getNotebook(notebookId: string): NotebookRecord | undefined {
    return this.notebooksMap.get(notebookId) as NotebookRecord | undefined;
  }

  private getEntry(entryId: string): DiaryEntryRecord | undefined {
    return this.entriesMap.get(entryId) as DiaryEntryRecord | undefined;
  }

  private getAttachment(attachmentId: string): AttachmentRecord | undefined {
    return this.attachmentsMap.get(attachmentId) as AttachmentRecord | undefined;
  }

  private touchNotebook(notebookId: string, updatedAt: number) {
    const notebook = this.getNotebook(notebookId);
    if (!notebook) return;
    this.notebooksMap.set(notebookId, {
      ...notebook,
      updatedAt,
    });
  }

  private readProfile(): ProfileRecord {
    const raw = this.profileMap.toJSON() as Partial<ProfileRecord>;
    const profile: ProfileRecord = {};
    if (typeof raw.name === 'string' && raw.name.trim()) {
      profile.name = raw.name;
    }
    if (typeof raw.avatarAttachmentId === 'string' && raw.avatarAttachmentId.trim()) {
      profile.avatarAttachmentId = raw.avatarAttachmentId;
    }
    if (typeof raw.updatedAt === 'number') {
      profile.updatedAt = raw.updatedAt;
    }
    return profile;
  }

  private get profileMap(): LoroMap<Record<string, unknown>> {
    return this.doc.getMap(PROFILE) as LoroMap<Record<string, unknown>>;
  }

  private get notebookOrder(): LoroMovableList<string> {
    return this.doc.getMovableList(NOTEBOOK_ORDER) as LoroMovableList<string>;
  }

  private get notebooksMap(): LoroMap<Record<string, unknown>> {
    return this.doc.getMap(NOTEBOOKS) as LoroMap<Record<string, unknown>>;
  }

  private get entriesMap(): LoroMap<Record<string, unknown>> {
    return this.doc.getMap(ENTRIES) as LoroMap<Record<string, unknown>>;
  }

  private get attachmentsMap(): LoroMap<Record<string, unknown>> {
    return this.doc.getMap(ATTACHMENTS) as LoroMap<Record<string, unknown>>;
  }

  private get groupsList(): LoroMovableList<string> {
    return this.doc.getMovableList(GROUPS) as LoroMovableList<string>;
  }

  private get tagsList(): LoroMovableList<string> {
    return this.doc.getMovableList(TAGS) as LoroMovableList<string>;
  }
}
