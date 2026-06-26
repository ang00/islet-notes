import { cx } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import { Plus } from 'lucide-react';
import React, { useState } from 'react';

interface TagSelectorProps {
  allTags: string[];
  selectedTags: string[];
  onSave: (tags: string[]) => void;
  onAddNew: () => void;
  onCancel: () => void;
}

export function TagSelector({ allTags, selectedTags, onSave, onAddNew, onCancel }: TagSelectorProps) {
  const [selected, setSelected] = useState(() => new Set(selectedTags));

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/40'
      onClick={onCancel}
    >
      <div
        className='max-h-[60vh] w-full overflow-y-auto rounded-t-2xl bg-canvas px-4 pb-8 pt-5 shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        <p className='mb-4 text-center text-[16px] font-semibold leading-6 text-ink'>
          {localize('diary.tag', 'Tag')}
        </p>
        <div className='flex flex-wrap gap-2'>
          {allTags.map((tag) => {
            const isOn = selected.has(tag);
            return (
              <button
                key={tag}
                type='button'
                className={cx(
                  'rounded-full px-3.5 py-1.5 text-[14px] font-medium leading-5 transition',
                  isOn
                    ? 'bg-accent text-white'
                    : 'bg-surface text-muted active:bg-soft',
                )}
                onClick={() => toggle(tag)}
              >
                {isOn ? '✓ ' : ''}{tag}
              </button>
            );
          })}
        </div>
        <button
          type='button'
          className='mt-3 flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-accent active:bg-soft'
          onClick={onAddNew}
        >
          <Plus size={16} strokeWidth={2.5} />
          {localize('settings.addTag', 'Add tag')}
        </button>
        <div className='mt-5 flex gap-3'>
          <button
            type='button'
            className='flex-1 rounded-xl bg-surface py-2.5 text-[15px] font-medium text-muted active:bg-soft'
            onClick={onCancel}
          >
            {localize('common.cancel', 'Cancel')}
          </button>
          <button
            type='button'
            className='flex-1 rounded-xl bg-accent py-2.5 text-[15px] font-medium text-white'
            onClick={() => onSave([...selected])}
          >
            {localize('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
}
