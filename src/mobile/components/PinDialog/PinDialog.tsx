import { cx } from '@/mobile/styles/ui';
import { localize } from '@/nls';
import React, { useEffect, useRef, useState } from 'react';

interface PinDialogProps {
  title: string;
  onConfirm: (pin: string) => Promise<boolean> | boolean;
  onCancel: () => void;
}

export function PinDialog({ title, onConfirm, onCancel }: PinDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirming = value.length === 4;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setValue(digits);
    setError(false);
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    const ok = await onConfirm(value);
    if (!ok) {
      setError(true);
      setValue('');
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'
      onClick={onCancel}
    >
      <div
        className='mx-4 w-[280px] rounded-2xl bg-canvas px-6 py-6 shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        <p className='mb-5 text-center text-[16px] font-semibold leading-6 text-ink'>{title}</p>
        {error && (
          <p className='mb-3 text-center text-[13px] font-medium text-danger'>
            {localize('settings.pinWrong', 'Wrong PIN')}
          </p>
        )}
        <div className='mb-6 flex justify-center gap-3'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cx(
                'flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-bold transition',
                value[i]
                  ? 'border-accent bg-accent/5 text-ink'
                  : 'border-border text-placeholder',
              )}
            >
              {value[i] ?? '_'}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          type='tel'
          inputMode='numeric'
          pattern='[0-9]*'
          autoComplete='one-time-code'
          className='sr-only'
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && confirming) handleConfirm();
          }}
        />
        <div className='flex gap-3'>
          <button
            type='button'
            className='flex-1 rounded-xl bg-surface py-2.5 text-[15px] font-medium text-muted active:bg-soft'
            onClick={onCancel}
          >
            {localize('common.cancel', 'Cancel')}
          </button>
          <button
            type='button'
            className={cx(
              'flex-1 rounded-xl py-2.5 text-[15px] font-medium transition',
              confirming
                ? 'bg-accent text-white'
                : 'bg-surface text-placeholder',
            )}
            disabled={!confirming}
            onClick={handleConfirm}
          >
            {localize('common.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
