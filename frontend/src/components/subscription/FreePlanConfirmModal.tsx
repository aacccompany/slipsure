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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-zinc-950/20">
        <div className="flex items-start justify-between border-b border-zinc-100 p-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Zap className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-950">
                Activate Free Plan?
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                This free plan can be used only once for this account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-6">
          {[
            '50 verification credits are included.',
            'No payment is required.',
            'After activation, the Free plan will no longer appear for this account.',
          ].map((item) => (
            <div key={item} className="flex gap-3 text-sm text-zinc-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Activate Free
          </button>
        </div>
      </div>
    </div>
  );
}
