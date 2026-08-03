'use client';

import { ButtonHTMLAttributes } from 'react';

export function ConfirmButton({
  confirmMessage,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { confirmMessage: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    />
  );
}
