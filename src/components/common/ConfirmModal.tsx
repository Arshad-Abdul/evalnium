import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmLabel = 'Yes, Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
              <p className="text-[11px] font-semibold text-rose-700 mt-0.5">
                Permanent Action — Please confirm before continuing
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 disabled:opacity-40 cursor-pointer"
            aria-label="Close confirmation modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {itemName && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Selected Item
              </div>
              <div className="font-bold text-slate-900 break-words">{itemName}</div>
            </div>
          )}

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {message}
          </p>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className="w-1/2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Deleting...' : confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

