import React, { useCallback, useRef, useState } from 'react';

interface SwipeAction {
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
}

const ACTION_WIDTH = 72;
const SWIPE_THRESHOLD = 40;

export function SwipeableRow({ children, actions }: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [open, setOpen] = useState(false);
  const startXRef = useRef(0);
  const trackingRef = useRef(false);

  const maxSwipe = actions.length * ACTION_WIDTH;

  const close = useCallback(() => {
    setOpen(false);
    setTranslateX(0);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (open) {
      close();
      return;
    }
    trackingRef.current = true;
    startXRef.current = e.touches[0].clientX;
  }, [open, close]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!trackingRef.current || open) return;
      const delta = startXRef.current - e.touches[0].clientX;
      if (delta > 0) {
        setTranslateX(Math.min(delta, maxSwipe));
      }
    },
    [open, maxSwipe],
  );

  const handleTouchEnd = useCallback(() => {
    if (!trackingRef.current || open) return;
    trackingRef.current = false;
    if (translateX >= SWIPE_THRESHOLD) {
      setOpen(true);
      setTranslateX(maxSwipe);
    } else {
      setTranslateX(0);
    }
  }, [open, translateX, maxSwipe]);

  const handleContentClick = useCallback(() => {
    if (open) {
      close();
    }
  }, [open, close]);

  return (
    <div className='relative overflow-hidden' onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className='relative z-10 transition-transform duration-200 ease-out'
        style={{ transform: `translateX(-${translateX}px)` }}
        onClick={handleContentClick}
      >
        {children}
      </div>
      <div className='absolute inset-y-0 right-0 flex' style={{ width: `${maxSwipe}px` }}>
        {actions.map((action) => (
          <button
            key={action.label}
            type='button'
            className='flex min-w-0 flex-1 items-center justify-center text-sm font-medium text-white'
            style={{ backgroundColor: action.color, width: `${ACTION_WIDTH}px` }}
            onClick={() => {
              action.onClick();
              close();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
