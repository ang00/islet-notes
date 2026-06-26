import {
  getAttachmentById,
  getEntrySummary,
  getLastEntry,
  getNotebookListTime,
} from '@/core/diary/selectors';
import { formatNotebookListTime, getLocalTimeZone } from '@/core/format';
import type { DiaryModelData, NotebookRecord } from '@/core/diary/type';
import { CoverInitial } from '@/mobile/components/CoverInitial';
import { CoverThumb } from '@/mobile/components/CoverThumb';
import { DiaryList } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import { Lock } from 'lucide-react';
import React from 'react';

interface NotebookItemProps {
  model: DiaryModelData;
  notebook: NotebookRecord;
  onClick: () => void;
}

export function NotebookItem({ model, notebook, onClick }: NotebookItemProps) {
  const lastEntry = getLastEntry(model, notebook.id);
  const summary = getEntrySummary(model, lastEntry);
  const updatedAt = getNotebookListTime(model, notebook);
  const coverCandidate = notebook.avatarAttachmentId
    ? getAttachmentById(model, notebook.avatarAttachmentId)
    : undefined;
  const coverAttachment = coverCandidate?.type === 'image' ? coverCandidate : undefined;

  return (
    <button
      className={styles.NotebookItem.Root}
      type='button'
      data-test-id={DiaryList.notebookItem}
      onClick={onClick}
    >
      {coverAttachment ? (
        <CoverThumb attachment={coverAttachment} className={styles.NotebookItem.Cover} />
      ) : (
        <CoverInitial
          name={notebook.name}
          className={styles.NotebookItem.Cover}
          textClassName={styles.NotebookItem.CoverText}
        />
      )}
      <div className={styles.NotebookItem.Body}>
        <div className={styles.NotebookItem.TitleRow}>
          <span className={styles.NotebookItem.Name} data-test-id={DiaryList.notebookName}>
            {notebook.name}
          </span>
          {notebook.lockedAt && (
            <Lock size={14} className='ml-1.5 flex-none text-amber-500' strokeWidth={2.5} />
          )}
        </div>
        <div className={styles.NotebookItem.Summary}>
          {summary || localize('diary.notebook.emptySummary', 'No entries yet')}
        </div>
        {(notebook.group || (notebook.tags && notebook.tags.length > 0)) && (
          <div className='mt-1 flex flex-wrap items-center gap-1.5'>
            {notebook.group && (
              <span className='inline-flex items-center rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent'>
                {notebook.group}
              </span>
            )}
            {notebook.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className='inline-flex items-center rounded bg-soft px-1.5 py-0.5 text-[11px] text-muted'
              >
                {tag}
              </span>
            ))}
            {(notebook.tags?.length ?? 0) > 3 && (
              <span className='text-[11px] text-muted'>+{notebook.tags!.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <span className={styles.NotebookItem.Time}>
        {updatedAt > 0 &&
          formatNotebookListTime({
            timestamp: updatedAt,
            currenttime: Date.now(),
            timezone: getLocalTimeZone(),
          })}
      </span>
    </button>
  );
}
