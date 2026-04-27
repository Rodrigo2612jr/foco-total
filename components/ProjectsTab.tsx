import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  PauseCircle,
  Play,
  Plus,
  Rocket,
  Trash2,
  X
} from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { FrenteProject, FrenteProjectStep, ThemeType } from '../types';

interface Props {
  theme: ThemeType;
  categoryName: string;
  categoryColor: string;
  projects: FrenteProject[];
  onUpsertProject: (project: FrenteProject) => void;
  onDeleteProject: (id: string) => void;
}

const STATUS_META = {
  doing: { label: 'Em andamento', emoji: '🔄', color: '#2563EB' },
  paused: { label: 'Bloqueado', emoji: '⏸', color: '#F59E0B' },
  backlog: { label: 'Backlog', emoji: '📋', color: '#71717A' },
  done: { label: 'Concluído', emoji: '✅', color: '#10B981' }
} as const;

export const ProjectsTab: React.FC<Props> = ({
  theme,
  categoryName,
  categoryColor,
  projects,
  onUpsertProject,
  onDeleteProject
}) => {
  const isFem = theme === 'feminine';
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [showDoneCollapse, setShowDoneCollapse] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const grouped = useMemo(() => {
    const out: { [k in FrenteProject['status']]: FrenteProject[] } = {
      doing: [],
      paused: [],
      backlog: [],
      done: []
    };
    projects.forEach((p) => out[p.status].push(p));
    // Done ordenado por completedAt desc
    out.done.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return out;
  }, [projects]);

  const handleCreate = () => {
    const t = newTitle.trim();
    if (!t) return;
    const proj: FrenteProject = {
      id: crypto.randomUUID(),
      categoryName,
      title: t,
      status: 'backlog',
      steps: [],
      createdAt: new Date().toISOString()
    };
    onUpsertProject(proj);
    setNewTitle('');
    setCreating(false);
    setOpenProjectId(proj.id);
  };

  const openProject = openProjectId
    ? projects.find((p) => p.id === openProjectId) ?? null
    : null;

  const sectionOrder: FrenteProject['status'][] = ['doing', 'paused', 'backlog', 'done'];

  return (
    <div className="space-y-4">
      {/* Botão + Criar projeto */}
      {creating ? (
        <div
          className={`p-3 rounded-xl border-2 border-dashed flex gap-2 ${
            isFem ? 'border-blue-300 bg-blue-50/40' : 'border-blue-700 bg-blue-950/20'
          }`}
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={`Ex: Migração Shopify → Tray`}
            className={`flex-1 p-2.5 rounded-lg text-sm font-bold outline-none ${
              isFem
                ? 'bg-white text-zinc-900 border border-blue-200 focus:border-blue-400'
                : 'bg-black text-zinc-100 border border-blue-800 focus:border-blue-600'
            }`}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim()}
            className="px-3 py-2 rounded-lg text-[10px] font-black uppercase text-white bg-blue-600 disabled:opacity-40"
          >
            Criar
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNewTitle('');
            }}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase ${
              isFem ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Novo projeto
        </button>
      )}

      {projects.length === 0 && !creating && (
        <div className="text-center py-10 opacity-60">
          <Rocket className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-xs font-bold uppercase tracking-widest">Nenhum projeto ainda</p>
          <p className="text-[10px] mt-1 opacity-70">
            Cria um projeto pra rastrear processos em andamento.
          </p>
        </div>
      )}

      {/* Seções por status */}
      {sectionOrder.map((status) => {
        const list = grouped[status];
        if (list.length === 0 && status !== 'doing') return null;
        const meta = STATUS_META[status];
        const isDone = status === 'done';
        const showList = isDone ? showDoneCollapse : true;

        return (
          <div key={status}>
            <button
              onClick={() => isDone && setShowDoneCollapse((c) => !c)}
              disabled={!isDone}
              className={`w-full flex items-center gap-2 mb-2 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isFem ? 'text-zinc-600' : 'text-zinc-300'
                }`}
              >
                {meta.emoji} {meta.label} {list.length > 0 && `(${list.length})`}
              </span>
              {isDone && (
                <span className="ml-auto">
                  {showDoneCollapse ? (
                    <ChevronUp className={`w-4 h-4 ${isFem ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${isFem ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  )}
                </span>
              )}
            </button>

            {showList && list.length > 0 && (
              <div className="space-y-2">
                {list.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    theme={theme}
                    categoryColor={categoryColor}
                    onTap={() => setOpenProjectId(p.id)}
                  />
                ))}
              </div>
            )}

            {showList && list.length === 0 && status === 'doing' && (
              <p
                className={`text-[10px] italic ${isFem ? 'text-zinc-400' : 'text-zinc-600'} pl-4`}
              >
                Nenhum projeto ativo agora.
              </p>
            )}
          </div>
        );
      })}

      {/* Sub-modal do projeto */}
      {openProject && (
        <ProjectDetailSheet
          theme={theme}
          project={openProject}
          categoryColor={categoryColor}
          onClose={() => setOpenProjectId(null)}
          onUpsert={onUpsertProject}
          onDelete={() => {
            onDeleteProject(openProject.id);
            setOpenProjectId(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================
// CARD INDIVIDUAL DO PROJETO
// ============================================================
const ProjectCard: React.FC<{
  project: FrenteProject;
  theme: ThemeType;
  categoryColor: string;
  onTap: () => void;
}> = ({ project, theme, categoryColor, onTap }) => {
  const isFem = theme === 'feminine';
  const total = project.steps.length;
  const done = project.steps.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isDoing = project.status === 'doing';
  const isPaused = project.status === 'paused';
  const isDone = project.status === 'done';

  // Tempo desde último avanço (qualquer step done)
  const lastTouchDays = useMemo(() => {
    if (isDone) return null;
    if (project.startedAt) {
      return differenceInCalendarDays(new Date(), parseISO(project.startedAt));
    }
    return differenceInCalendarDays(new Date(), parseISO(project.createdAt));
  }, [project, isDone]);

  return (
    <button
      onClick={onTap}
      className={`w-full p-3.5 rounded-xl text-left transition-all active:scale-[0.99] ${
        isDoing
          ? isFem
            ? 'bg-white border-2 shadow-lg shadow-blue-200/30'
            : 'bg-zinc-900 border-2 shadow-lg shadow-blue-900/30'
          : isPaused
            ? isFem
              ? 'bg-amber-50 border-2 border-amber-300'
              : 'bg-amber-950/20 border-2 border-amber-700'
            : isDone
              ? isFem
                ? 'bg-zinc-50 border border-zinc-100 opacity-70'
                : 'bg-zinc-950 border border-zinc-800 opacity-70'
              : isFem
                ? 'bg-white border border-zinc-100'
                : 'bg-zinc-900 border border-zinc-800'
      }`}
      style={
        isDoing
          ? { borderColor: categoryColor }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-black ${
              isDone ? 'line-through' : ''
            } ${isFem ? 'text-zinc-900' : 'text-zinc-100'}`}
          >
            {project.title}
          </p>
          {isPaused && project.blockedReason && (
            <p className="text-[10px] mt-1 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {project.blockedReason}
            </p>
          )}
          {total > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden max-w-[120px] ${isFem ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <div
                  className="h-full transition-all"
                  style={{ backgroundColor: categoryColor, width: `${pct}%` }}
                />
              </div>
              <span className={`text-[9px] font-black ${isFem ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {done}/{total}
              </span>
            </div>
          )}
          {isDoing && lastTouchDays !== null && lastTouchDays > 0 && (
            <p className={`text-[9px] mt-1 flex items-center gap-1 ${isFem ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <Clock className="w-2.5 h-2.5" />
              {lastTouchDays === 1 ? 'há 1 dia' : `há ${lastTouchDays} dias`}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

// ============================================================
// SUB-MODAL: detalhe do projeto
// ============================================================
const ProjectDetailSheet: React.FC<{
  theme: ThemeType;
  project: FrenteProject;
  categoryColor: string;
  onClose: () => void;
  onUpsert: (p: FrenteProject) => void;
  onDelete: () => void;
}> = ({ theme, project, categoryColor, onClose, onUpsert, onDelete }) => {
  const isFem = theme === 'feminine';
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? '');
  const [blockedReason, setBlockedReason] = useState(project.blockedReason ?? '');
  const [steps, setSteps] = useState<FrenteProjectStep[]>(project.steps);
  const [newStep, setNewStep] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const persist = (overrides: Partial<FrenteProject> = {}) => {
    const next: FrenteProject = {
      ...project,
      title: title.trim() || project.title,
      description: description.trim() || undefined,
      blockedReason: blockedReason.trim() || undefined,
      steps,
      ...overrides
    };
    onUpsert(next);
  };

  const setStatus = (status: FrenteProject['status']) => {
    const overrides: Partial<FrenteProject> = { status };
    if (status === 'doing' && !project.startedAt) overrides.startedAt = new Date().toISOString();
    if (status === 'done') overrides.completedAt = new Date().toISOString();
    persist(overrides);
  };

  const toggleStep = (id: string) => {
    const updated = steps.map((s) => {
      if (s.id !== id) return s;
      const next = !s.done;
      if (next) {
        return { ...s, done: true, completedAt: new Date().toISOString() };
      }
      // Desmarcando — remove completedAt
      const { completedAt, ...rest } = s;
      return { ...rest, done: false };
    });
    setSteps(updated);
    // Auto-status: 1ª etapa done → vira doing; todos done → vira done
    const total = updated.length;
    const doneCount = updated.filter((s) => s.done).length;
    let nextStatus = project.status;
    if (project.status === 'backlog' && doneCount > 0) nextStatus = 'doing';
    if (total > 0 && doneCount === total && project.status !== 'done') nextStatus = 'done';
    onUpsert({
      ...project,
      title: title.trim() || project.title,
      description: description.trim() || undefined,
      blockedReason: blockedReason.trim() || undefined,
      steps: updated,
      status: nextStatus,
      startedAt:
        nextStatus === 'doing' && !project.startedAt
          ? new Date().toISOString()
          : project.startedAt,
      completedAt:
        nextStatus === 'done' ? new Date().toISOString() : project.completedAt
    });
  };

  const addStep = () => {
    const t = newStep.trim();
    if (!t) return;
    const updated = [...steps, { id: crypto.randomUUID(), text: t, done: false }];
    setSteps(updated);
    setNewStep('');
    persist({ steps: updated });
  };

  const removeStep = (id: string) => {
    const updated = steps.filter((s) => s.id !== id);
    setSteps(updated);
    persist({ steps: updated });
  };

  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const pendingSteps = steps.filter((s) => !s.done);
  const completedSteps = steps.filter((s) => s.done);

  const panelCls = `relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] border mobile-modal-content-sheet sm:!max-h-[85vh] sm:!position-static sm:!rounded-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden ${
    isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
  }`;

  const inputCls = `w-full p-3 rounded-xl text-sm font-bold outline-none ${
    isFem
      ? 'bg-rose-50/40 text-zinc-900 border border-rose-200 focus:border-rose-400'
      : 'bg-black text-zinc-100 border border-zinc-800 focus:border-zinc-600'
  }`;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { persist(); onClose(); }} />
      <div className={panelCls}>
        {/* Header */}
        <div
          className="shrink-0 px-5 sm:px-7 pt-5 sm:pt-6 pb-3 border-b"
          style={{ borderColor: categoryColor + '33' }}
        >
          <div className="pull-indicator sm:hidden" />
          <div className="flex items-start gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => persist()}
              className={`flex-1 bg-transparent text-base sm:text-lg font-black uppercase outline-none ${
                isFem ? 'text-zinc-900' : 'text-white'
              }`}
            />
            <button
              onClick={() => { persist(); onClose(); }}
              className={`p-2 ${isFem ? 'text-rose-300' : 'text-zinc-600'} hover:opacity-70`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status switcher */}
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>)
              .sort((a, b) => {
                // ordem: backlog, doing, paused, done
                const o = { backlog: 0, doing: 1, paused: 2, done: 3 };
                return o[a] - o[b];
              })
              .map((st) => (
                <button
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    project.status === st
                      ? 'text-white'
                      : isFem
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-zinc-800 text-zinc-400'
                  }`}
                  style={project.status === st ? { backgroundColor: STATUS_META[st].color } : undefined}
                >
                  {STATUS_META[st].emoji}
                  <br />
                  <span className="text-[8px]">{STATUS_META[st].label}</span>
                </button>
              ))}
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${isFem ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                <div
                  className="h-full transition-all"
                  style={{ backgroundColor: categoryColor, width: `${pct}%` }}
                />
              </div>
              <span className={`text-[10px] font-black ${isFem ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {doneCount}/{total} ({pct}%)
              </span>
            </div>
          )}

          {/* Bloqueado: motivo */}
          {project.status === 'paused' && (
            <input
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              onBlur={() => persist()}
              placeholder="Por que tá bloqueado? (ex: esperando suporte da Tray)"
              className={`w-full mt-3 p-2.5 rounded-lg text-xs font-bold outline-none border-2 ${
                isFem
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-amber-950/30 text-amber-200 border-amber-700'
              }`}
            />
          )}
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 space-y-4">
          {/* Descrição */}
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-zinc-500' : 'text-zinc-500'}`}>
              📝 Notas / Descrição
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => persist()}
              placeholder="Notas sobre o projeto..."
              rows={3}
              className={inputCls}
            />
          </div>

          {/* Etapas pendentes */}
          {pendingSteps.length > 0 && (
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>
                ⏳ Etapas pendentes ({pendingSteps.length})
              </p>
              <div className="space-y-1.5">
                {pendingSteps.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-lg flex items-center gap-2 ${
                      isFem ? 'bg-white border border-zinc-100' : 'bg-zinc-950 border border-zinc-800'
                    }`}
                  >
                    <button
                      onClick={() => toggleStep(s.id)}
                      className={`p-1 ${isFem ? 'text-zinc-400 hover:text-rose-600' : 'text-zinc-600 hover:text-blue-500'}`}
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <span className={`flex-1 text-xs font-bold ${isFem ? 'text-zinc-900' : 'text-zinc-200'}`}>
                      {s.text}
                    </span>
                    <button
                      onClick={() => removeStep(s.id)}
                      className={`p-1 ${isFem ? 'text-zinc-300 hover:text-red-500' : 'text-zinc-600 hover:text-red-400'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Etapas concluídas */}
          {completedSteps.length > 0 && (
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-zinc-400' : 'text-zinc-600'}`}>
                ✅ Concluídas ({completedSteps.length})
              </p>
              <div className="space-y-1">
                {completedSteps.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2 rounded-lg flex items-center gap-2 opacity-60 ${
                      isFem ? 'bg-zinc-50' : 'bg-zinc-950'
                    }`}
                  >
                    <button
                      onClick={() => toggleStep(s.id)}
                      className={`p-1 ${isFem ? 'text-green-600' : 'text-green-500'}`}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>
                    <span className={`flex-1 text-xs line-through ${isFem ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {s.text}
                    </span>
                    <button
                      onClick={() => removeStep(s.id)}
                      className={`p-1 ${isFem ? 'text-zinc-300 hover:text-red-500' : 'text-zinc-600 hover:text-red-400'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar etapa */}
          <div
            className={`p-2 rounded-lg border-2 border-dashed flex gap-2 ${
              isFem ? 'border-zinc-200' : 'border-zinc-700'
            }`}
          >
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStep()}
              placeholder="+ Adicionar etapa"
              className={`flex-1 p-2 bg-transparent text-xs font-bold outline-none ${
                isFem ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100 placeholder:text-zinc-500'
              }`}
            />
            {newStep.trim() && (
              <button
                onClick={addStep}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white bg-blue-600"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Deletar projeto */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {confirmDelete ? (
              <div className="flex gap-2 items-center">
                <span className={`text-[10px] font-black uppercase ${isFem ? 'text-red-700' : 'text-red-400'}`}>
                  Apagar projeto?
                </span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                    isFem ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  Não
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-white bg-red-600"
                >
                  Sim, apagar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isFem ? 'text-red-500 hover:text-red-700' : 'text-red-400 hover:text-red-300'
                }`}
              >
                <Trash2 className="w-3 h-3 inline mr-1" /> Apagar projeto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
