'use client';

import { Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isLoading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isLoading = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--navy)' }}>{title}</h3>
          <button onClick={onCancel} disabled={isLoading} style={{ color: 'var(--text-muted)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: destructive ? '#E11D48' : 'var(--navy)', color: '#fff' }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-semibold transition-all hover:opacity-90"
            style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
