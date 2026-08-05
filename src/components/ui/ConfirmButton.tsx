'use client';

import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface ConfirmButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  confirmMessage: string;
  confirmTitle?: string;
  confirmLabel?: string;
  onClick?: () => void;
  children?: ReactNode;
}

// Was a plain wrapper around window.confirm(): native, ugly, and (bug) it
// called onClick unconditionally after the confirm() check regardless of
// whether the user hit OK or Cancel, since the check only ran
// e.preventDefault() for the form-submission call sites - the direct-onClick
// call site (PathTracker's delete) had no such guard and fired every time.
// Now opens ConfirmDialog and only ever calls onClick / submits the form
// from its onConfirm, never on cancel or dismiss.
export function ConfirmButton({
  confirmMessage,
  confirmTitle = 'Are you sure?',
  confirmLabel = 'Delete',
  onClick,
  children,
  ...props
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = () => {
    setOpen(false);
    if (onClick) {
      onClick();
    } else {
      // No onClick means this call site relies on the ancestor <form>'s
      // action (the original type="submit" behavior) - submit it directly
      // now that this button itself is type="button".
      buttonRef.current?.closest('form')?.requestSubmit();
    }
  };

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} {...props}>
        {children}
      </button>
      <ConfirmDialog
        isOpen={open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
