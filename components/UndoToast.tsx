import React, { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { ThemeType } from '../types';

export interface UndoToastData {
  id: string;
  message: string;
  onUndo: () => void;
}

interface Props {
  theme: ThemeType;
  toast: UndoToastData | null;
  onDismiss: () => void;
  durationMs?: number;
}

export const UndoToast: React.FC<Props> = ({ theme, toast, onDismiss, durationMs = 6000 }) => {
  const isFem = theme === 'feminine';

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onDismiss(), durationMs);
    return () => clearTimeout(t);
  }, [toast, durationMs, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom duration-300">
      <div
        className={`flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl border ${
          isFem
            ? 'bg-white border-rose-200 text-rose-900 shadow-rose-200/50'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-black/60'
        }`}
      >
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          {toast.message}
        </span>
        <button
          onClick={() => {
            toast.onUndo();
            onDismiss();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            isFem ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          <RotateCcw className="w-3 h-3" /> Desfazer
        </button>
        <button
          onClick={onDismiss}
          className={isFem ? 'text-rose-300 hover:text-rose-600' : 'text-zinc-500 hover:text-white'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
