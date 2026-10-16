'use client';

import { Check, Loader2, X, Zap } from 'lucide-react';

interface FreePlanConfirmModalProps {
  open: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FreePlanConfirmModal({
  open,
  isLoading = false,
  onCancel,
  onConfirm,
}: FreePlanConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ background: 'var(--blue-pale)' }}>
              <Zap className="h-5 w-5" style={{ color: 'var(--blue)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--navy)' }}>
                Activate Free Plan?
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                This free plan can be used only once for this account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-6">
          {[
            '20 verification credits are included.',
            'No payment is required.',
            'After activation, the Free plan will no longer appear for this account.',
          ].map((item) => (
            <div key={item} className="flex gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center" style={{ background: '#ECFDF5', color: '#047857' }}>
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 p-6 sm:flex-row sm:justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--navy)', color: '#fff' }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Activate Free
          </button>
        </div>
      </div>
    </div>
  );
}
