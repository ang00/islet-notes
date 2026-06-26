import { DiaryModel } from '@/core/diary/model';
import {
  AttachmentRecord,
  CreateAttachmentEntryOptions,
  CreateTextEntryOptions,
  DiaryEntryRecord,
  DiaryModelData,
} from '@/core/diary/type';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { IHostService } from '@/services/native/common/hostService';
import { decodeBase64, encodeBase64, VSBuffer } from 'vscf/base/common/buffer';
import { Emitter } from 'vscf/base/common/event';
import { DisposableStore } from 'vscf/base/common/lifecycle';
import { FileStorage } from '../common/fileStorage';
import { IDiaryService } from '../common/diaryService';
import { IDiaryStorage } from '../common/storage';

interface DataModel {
  storage: IDiaryStorage;
  diaryModel: DiaryModel;
  modelData: DiaryModelData;
  dispose: () => void;
  save: () => Promise<void>;
}

export class WorkbenchDiaryService implements IDiaryService {
  readonly _serviceBrand: undefined;
  private dataModel: DataModel | null = null;
  private readonly _onStateChange = new Emitter<void>();
  public readonly onStateChange = this._onStateChange.event;
  private readonly _onSyncStateChange = new Emitter<void>();
  public readonly onSyncStateChange = this._onSyncStateChange.event;
  private saveRunning = false;
  private saveAgain = false;
  private readonly saveWaiters: Array<() => void> = [];
  private applyingRemoteSnapshot = false;
  private ignoreDatabaseSync = false;
  private remoteSyncRunning = false;
  private remoteSyncAgain = false;
  private readonly remoteSyncWaiters: Array<() => void> = [];

  constructor(
    @IFileAssetService private readonly fileAssetService: IFileAssetService,
    @IHostService private readonly hostService: IHostService,
  ) {}

  get initialized() {
    return !!this.dataModel;
  }

  get isSyncing() {
    return this.remoteSyncRunning;
  }

  setIgnoreDatabaseSync(ignore: boolean): void {
    this.ignoreDatabaseSync = ignore;
  }

  get modelState() {
    if (!this.dataModel) {
      throw new Error('Diary model is not initialized.');
    }
    return this.dataModel.modelData;
  }

  async initStorageScope(scopeId: string): Promise<void> {
    await this.initStorageFromStorage(this.createStorage(scopeId));
  }

  async initializeStorageScopeFromSnapshot(scopeId: string, snapshot: Uint8Array): Promise<void> {
    const storage = this.createStorage(scopeId);
    const existingKeys = await storage.list();
    if (existingKeys.length > 0) return;
    await storage.save(encodeBase64(VSBuffer.wrap(snapshot)));
  }

  private createStorage(scopeId: string): IDiaryStorage {
    return new FileStorage(`chat-diary/chat-diary-${scopeId}`, this.hostService);
  }

  private async initStorageFromStorage(storage: IDiaryStorage): Promise<void> {
    const diaryModel = await DiaryModel.create();
    await this.importLocalSnapshots(storage, diaryModel);

    const saveToStorage = () =>
      this.enqueueSave(async () => {
        await this.saveLocalSnapshot(storage, diaryModel);
      });

    const disposeStore = new DisposableStore();
    const dataModel: DataModel = {
      storage,
      diaryModel,
      modelData: diaryModel.toJSON(),
      save: saveToStorage,
      dispose: () => disposeStore.dispose(),
    };
    disposeStore.add(
      diaryModel.onModelChange(() => {
        if (this.applyingRemoteSnapshot) return;
        void dataModel.save();
        if (!this.ignoreDatabaseSync) {
          this.requestRemoteSync(storage, diaryModel, dataModel);
        }
        dataModel.modelData = diaryModel.toJSON();
        this._onStateChange.fire();
      }),
    );

    this.dataModel?.dispose();
    this.dataModel = dataModel;
    diaryModel.ensureDefaultNotebook();
    dataModel.modelData = diaryModel.toJSON();
    this._onStateChange.fire();
    this.requestRemoteSync(storage, diaryModel, dataModel);
  }

  addNotebook(name: string): string {
    return this.diaryModel.addNotebook(name);
  }

  async syncNow(): Promise<void> {
    if (!this.dataModel) return;
    if (this.remoteSyncRunning) {
      this.remoteSyncAgain = true;
      return new Promise((resolve) => this.remoteSyncWaiters.push(resolve));
    }
    await this.runRemoteSync(this.dataModel.storage, this.dataModel.diaryModel, this.dataModel);
  }

  softDeleteNotebook(notebookId: string): void {
    this.diaryModel.softDeleteNotebook(notebookId);
    this.diaryModel.ensureDefaultNotebook();
    if (this.dataModel) {
      this.dataModel.modelData = this.diaryModel.toJSON();
      this._onStateChange.fire();
    }
  }

  pinNotebook(notebookId: string): void {
    this.diaryModel.pinNotebook(notebookId);
    if (this.dataModel) {
      this.dataModel.modelData = this.diaryModel.toJSON();
      this._onStateChange.fire();
    }
  }

  unpinNotebook(notebookId: string): void {
    this.diaryModel.unpinNotebook(notebookId);
    if (this.dataModel) {
      this.dataModel.modelData = this.diaryModel.toJSON();
      this._onStateChange.fire();
    }
  }

  updateNotebookName(notebookId: string, name: string): void {
    this.diaryModel.updateNotebookName(notebookId, name);
  }

  updateNotebookAvatar(notebookId: string, avatarAttachmentId: string | undefined): void {
    this.diaryModel.updateNotebookAvatar(notebookId, avatarAttachmentId);
  }

  updateProfileName(name: string): void {
    this.diaryModel.updateProfileName(name);
  }

  updateProfileAvatar(avatarAttachmentId: string | undefined): void {
    this.diaryModel.updateProfileAvatar(avatarAttachmentId);
  }

  addTextEntry(notebookId: string, text: string): string {
    return this.diaryModel.addTextEntry({ notebookId, text });
  }

  addTextEntryWithOptions(options: CreateTextEntryOptions): string {
    return this.diaryModel.addTextEntry(options);
  }

  addTextEntriesWithOptions(optionsList: CreateTextEntryOptions[]): string[] {
    return this.diaryModel.addTextEntries(optionsList);
  }

  addEntryForTest(entry: DiaryEntryRecord): string {
    return this.diaryModel.addEntryForTest(entry);
  }

  updateTextEntry(entryId: string, text: string): void {
    this.diaryModel.updateTextEntry(entryId, text);
  }

  addAttachmentEntry(options: CreateAttachmentEntryOptions): string {
    return this.diaryModel.addAttachmentEntry(options);
  }

  updateAttachmentEntryText(entryId: string, text: string | undefined): void {
    this.diaryModel.updateAttachmentEntryText(entryId, text);
  }

  moveEntryToNotebook(entryId: string, targetNotebookId: string): void {
    this.diaryModel.moveEntryToNotebook(entryId, targetNotebookId);
  }

  addAttachment(attachment: AttachmentRecord): void {
    this.diaryModel.addAttachment(attachment);
  }

  softDeleteEntry(entryId: string): void {
    this.diaryModel.softDeleteEntry(entryId);
  }

  addGroup(name: string): void {
    this.diaryModel.addGroup(name);
  }

  renameGroup(oldName: string, newName: string): void {
    this.diaryModel.renameGroup(oldName, newName);
  }

  deleteGroup(name: string): void {
    this.diaryModel.deleteGroup(name);
  }

  addTag(name: string): void {
    this.diaryModel.addTag(name);
  }

  renameTag(oldName: string, newName: string): void {
    this.diaryModel.renameTag(oldName, newName);
  }

  deleteTag(name: string): void {
    this.diaryModel.deleteTag(name);
  }

  setNotebookGroup(notebookId: string, group: string | undefined): void {
    this.diaryModel.setNotebookGroup(notebookId, group);
  }

  setNotebookTags(notebookId: string, tags: string[]): void {
    this.diaryModel.setNotebookTags(notebookId, tags);
  }

  private get diaryModel() {
    if (!this.dataModel) {
      throw new Error('Diary model is not initialized.');
    }
    return this.dataModel.diaryModel;
  }

  // Boot must survive a corrupted snapshot file (e.g. a write the OS cut
  // short). Snapshots are written new-key-then-delete-old, so when one file
  // is unreadable an older intact one is usually present — skip the bad one
  // instead of failing startup; remote sync backfills anything missing.
  private async importLocalSnapshots(
    storage: IDiaryStorage,
    diaryModel: DiaryModel,
  ): Promise<void> {
    const keys = await storage.list();
    for (const key of keys) {
      try {
        const content = await storage.read(key);
        if (!content) continue;
        diaryModel.import([decodeBase64(content).buffer]);
      } catch (error) {
        console.error(`Skipped unreadable local diary snapshot "${key}":`, error);
      }
    }
  }

  private async enqueueSave(task: () => Promise<void>): Promise<void> {
    if (this.saveRunning) {
      this.saveAgain = true;
      return new Promise((resolve) => this.saveWaiters.push(resolve));
    }
    this.saveRunning = true;
    try {
      do {
        this.saveAgain = false;
        await task();
      } while (this.saveAgain);
    } catch (error) {
      console.error('Failed to save diary database:', error);
    } finally {
      this.saveRunning = false;
      const waiters = this.saveWaiters.splice(0);
      waiters.forEach((resolve) => resolve());
    }
  }

  private async saveLocalSnapshot(storage: IDiaryStorage, diaryModel: DiaryModel): Promise<void> {
    await this.replaceLocalSnapshot(storage, diaryModel.export());
  }

  private async replaceLocalSnapshot(storage: IDiaryStorage, snapshot: Uint8Array): Promise<void> {
    const keys = await storage.list();
    await storage.save(encodeBase64(VSBuffer.wrap(snapshot)));
    for (const key of keys) {
      await storage.delete(key);
    }
  }

  private async syncRemoteDatabase(
    diaryModel: DiaryModel,
    localSnapshot: Uint8Array,
  ): Promise<Uint8Array | undefined> {
    return this.fileAssetService.syncDatabaseSnapshot(
      localSnapshot,
      (remoteSnapshot) => {
        this.applyingRemoteSnapshot = true;
        try {
          diaryModel.import([remoteSnapshot]);
        } finally {
          this.applyingRemoteSnapshot = false;
        }
        return {
          snapshot: diaryModel.export(),
          localVersionKey: diaryModel.getVersionKey(),
        };
      },
      {
        localVersionKey: diaryModel.getVersionKey(),
      },
    );
  }

  private requestRemoteSync(
    storage: IDiaryStorage,
    diaryModel: DiaryModel,
    dataModel: DataModel,
  ): void {
    if (this.remoteSyncRunning) {
      this.remoteSyncAgain = true;
      return;
    }
    void this.runRemoteSync(storage, diaryModel, dataModel);
  }

  private async runRemoteSync(
    storage: IDiaryStorage,
    diaryModel: DiaryModel,
    dataModel: DataModel,
  ): Promise<void> {
    this.remoteSyncRunning = true;
    this._onSyncStateChange.fire();
    try {
      do {
        this.remoteSyncAgain = false;
        await this.syncSnapshotToRemote(storage, diaryModel, dataModel);
      } while (this.remoteSyncAgain && this.dataModel === dataModel);
    } finally {
      this.remoteSyncRunning = false;
      this._onSyncStateChange.fire();
      const waiters = this.remoteSyncWaiters.splice(0);
      waiters.forEach((resolve) => resolve());
    }
  }

  private async syncSnapshotToRemote(
    storage: IDiaryStorage,
    diaryModel: DiaryModel,
    dataModel: DataModel,
  ): Promise<void> {
    const localSnapshot = diaryModel.export();
    try {
      const mergedSnapshot = await this.syncRemoteDatabase(diaryModel, localSnapshot);
      if (this.dataModel !== dataModel) return;
      if (mergedSnapshot) {
        await this.enqueueSave(async () => {
          await this.saveLocalSnapshot(storage, diaryModel);
        });
        dataModel.modelData = diaryModel.toJSON();
        this._onStateChange.fire();
      }
    } catch (error) {
      if (this.dataModel === dataModel) {
        const currentSnapshot = diaryModel.export();
        if (!sameBytes(localSnapshot, currentSnapshot)) {
          await this.enqueueSave(async () => {
            await this.saveLocalSnapshot(storage, diaryModel);
          });
          dataModel.modelData = diaryModel.toJSON();
          this._onStateChange.fire();
        }
      }
      console.error('Failed to sync diary database to S3:', error);
    }
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let i = 0; i < left.byteLength; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
