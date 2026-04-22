import React from 'react';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Category, Goal, Priority, Task, ThemeType } from '../types';

// ---------- Estilos compartilhados ----------
const modalOverlay = 'fixed inset-0 z-[70] flex items-end sm:items-center justify-center';
const modalBackdrop = 'absolute inset-0 bg-black/40 backdrop-blur-sm';
const modalPanel = (isFem: boolean) =>
  `relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border mobile-modal-content-sheet sm:!max-h-none sm:!position-static sm:!rounded-[2.5rem] overflow-y-auto ${
    isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
  }`;
const inputCls = (isFem: boolean) =>
  `w-full p-4 rounded-[2rem] text-xs font-bold uppercase outline-none ${
    isFem
      ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300'
      : 'bg-black border border-zinc-800 text-white'
  }`;
const selectCls = (isFem: boolean) =>
  `p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${
    isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'
  }`;
const btnCancel = (isFem: boolean) =>
  `px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${
    isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'
  }`;
const btnSave = (isFem: boolean) =>
  `px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-white ${
    isFem ? 'bg-rose-600 shadow-rose-300/60' : 'bg-blue-600'
  }`;

// ============================================================
// GOAL MODAL
// ============================================================
export interface GoalDraft {
  title: string;
  date: string;
  category: Category;
  priority: Priority;
  isDaily: boolean;
  description: string;
}

export const GoalEditModal: React.FC<{
  theme: ThemeType;
  goal: Goal;
  draft: GoalDraft;
  setDraft: (d: GoalDraft) => void;
  categoryOptions: string[];
  onSave: () => void;
  onClose: () => void;
}> = ({ theme, goal, draft, setDraft, categoryOptions, onSave, onClose }) => {
  const isFem = theme === 'feminine';
  return (
    <div className={modalOverlay}>
      <div className={modalBackdrop} onClick={onClose} />
      <div className={modalPanel(isFem)}>
        <div className="pull-indicator sm:hidden" />
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>
            Editar Meta
          </h3>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Título da meta"
            className={inputCls(isFem)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className={selectCls(isFem)}
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
              className={selectCls(isFem)}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              className={selectCls(isFem)}
            >
              <option value={Priority.LOW}>Baixa</option>
              <option value={Priority.MEDIUM}>Média</option>
              <option value={Priority.HIGH}>Alta</option>
            </select>
            <label
              className={`flex items-center justify-center gap-2 px-4 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.3em] ${
                isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'
              }`}
            >
              <input
                type="checkbox"
                checked={draft.isDaily}
                onChange={(e) => setDraft({ ...draft, isDaily: e.target.checked })}
                className="accent-rose-500"
              />
              Todos os dias
            </label>
          </div>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Descrição rápida"
            className={`${inputCls(isFem)} min-h-[120px]`}
          />
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className={btnCancel(isFem)}>
              Cancelar
            </button>
            <button type="submit" className={btnSave(isFem)}>
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// TASK MODAL
// ============================================================
export interface TaskDraft {
  title: string;
  date: string;
  category: Category;
  isDaily: boolean;
}

export const TaskEditModal: React.FC<{
  theme: ThemeType;
  task: Task;
  draft: TaskDraft;
  setDraft: (d: TaskDraft) => void;
  categoryOptions: string[];
  onSave: () => void;
  onClose: () => void;
}> = ({ theme, task, draft, setDraft, categoryOptions, onSave, onClose }) => {
  const isFem = theme === 'feminine';
  return (
    <div className={modalOverlay}>
      <div className={modalBackdrop} onClick={onClose} />
      <div className={modalPanel(isFem)}>
        <div className="pull-indicator sm:hidden" />
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>
            Editar Tarefa
          </h3>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Título da tarefa"
            className={inputCls(isFem)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className={selectCls(isFem)}
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
              className={selectCls(isFem)}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.3em] ${
              isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'
            }`}
          >
            <input
              type="checkbox"
              checked={draft.isDaily}
              onChange={(e) => setDraft({ ...draft, isDaily: e.target.checked })}
              className="accent-rose-500"
            />
            Todos os dias
          </label>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className={btnCancel(isFem)}>
              Cancelar
            </button>
            <button type="submit" className={btnSave(isFem)}>
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// NOTE MODAL
// ============================================================
export const NoteEditModal: React.FC<{
  theme: ThemeType;
  value: string;
  setValue: (s: string) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ theme, value, setValue, onSave, onClose }) => {
  const isFem = theme === 'feminine';
  return (
    <div className={modalOverlay}>
      <div className={modalBackdrop} onClick={onClose} />
      <div className={`${modalPanel(isFem)} sm:max-w-xl`}>
        <div className="pull-indicator sm:hidden" />
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>
            Editar Nota
          </h3>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Nota"
            className={`${inputCls(isFem)} min-h-[160px]`}
          />
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className={btnCancel(isFem)}>
              Cancelar
            </button>
            <button type="submit" className={btnSave(isFem)}>
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper para reformatar data ISO pro formulário
export const isoToDateInput = (iso: string): string => format(parseISO(iso), 'yyyy-MM-dd');
