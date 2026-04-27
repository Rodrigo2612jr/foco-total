import React, { useState } from 'react';
import { Check, CheckCircle2, Circle, Lightbulb, Plus, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { CategoryDef, FrenteIdea, FrenteProject, RecurringTask, Task, ThemeType } from '../types';
import { frequencyLabel, frequencyShort } from '../services/recurringService';
import { ProjectsTab } from './ProjectsTab';

interface Summary {
  cat: CategoryDef;
  daysSince: number | null;
  pendingTasks: number;
  ideasCount: number;
}

interface Props {
  theme: ThemeType;
  summary: Summary;
  recurringTasks: RecurringTask[];
  tasks: Task[];
  ideas: FrenteIdea[];
  projects: FrenteProject[];
  onAddIdea: (text: string) => void;
  onToggleIdea: (id: string) => void;
  onDeleteIdea: (id: string) => void;
  onToggleTask: (taskId: string) => void;
  onUpsertProject: (project: FrenteProject) => void;
  onDeleteProject: (id: string) => void;
  onClose: () => void;
}

export const FrenteBottomSheet: React.FC<Props> = ({
  theme,
  summary,
  recurringTasks,
  tasks,
  ideas,
  projects,
  onAddIdea,
  onToggleIdea,
  onDeleteIdea,
  onToggleTask,
  onUpsertProject,
  onDeleteProject,
  onClose
}) => {
  const isFem = theme === 'feminine';
  const [tab, setTab] = useState<'tasks' | 'ideas' | 'projects'>('tasks');
  const activeProjects = projects.filter((p) => p.status === 'doing' || p.status === 'paused' || p.status === 'backlog');
  const [newIdea, setNewIdea] = useState('');

  const pendingTasks = tasks.filter((t) => !t.completed).slice(0, 20);
  const recentDoneTasks = tasks
    .filter((t) => t.completed && t.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 10);

  const activeIdeas = ideas.filter((i) => !i.done);
  const archivedIdeas = ideas.filter((i) => i.done);

  const handleAddIdea = () => {
    const text = newIdea.trim();
    if (!text) return;
    onAddIdea(text);
    setNewIdea('');
  };

  const panelCls = `relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] border mobile-modal-content-sheet sm:!max-h-[85vh] sm:!position-static sm:!rounded-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden ${
    isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
  }`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={panelCls}>
        {/* HEADER fixo */}
        <div
          className="shrink-0 px-5 sm:px-7 pt-5 sm:pt-6 pb-3 border-b"
          style={{ borderColor: summary.cat.color + '33', background: summary.cat.color + '11' }}
        >
          <div className="pull-indicator sm:hidden" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-lg"
                style={{ backgroundColor: summary.cat.color }}
              >
                {summary.cat.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className={`text-base sm:text-lg font-black uppercase truncate ${isFem ? 'text-zinc-900' : 'text-white'}`}>
                  {summary.cat.name}
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isFem ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {summary.daysSince === null ? 'sem histórico' : summary.daysSince === 0 ? 'última ação hoje' : `${summary.daysSince}d desde último avanço`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`shrink-0 p-2 ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-500 hover:text-white'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TABS — 3 abas */}
          <div className={`flex gap-1 p-1 rounded-2xl ${isFem ? 'bg-white' : 'bg-zinc-950'}`}>
            <button
              onClick={() => setTab('tasks')}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                tab === 'tasks' ? 'text-white' : isFem ? 'text-zinc-500' : 'text-zinc-500'
              }`}
              style={tab === 'tasks' ? { backgroundColor: summary.cat.color } : undefined}
            >
              📋 Tarefas{pendingTasks.length > 0 ? ` (${pendingTasks.length})` : ''}
            </button>
            <button
              onClick={() => setTab('projects')}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                tab === 'projects' ? 'text-white' : isFem ? 'text-zinc-500' : 'text-zinc-500'
              }`}
              style={tab === 'projects' ? { backgroundColor: summary.cat.color } : undefined}
            >
              🚀 Projetos{activeProjects.length > 0 ? ` (${activeProjects.length})` : ''}
            </button>
            <button
              onClick={() => setTab('ideas')}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                tab === 'ideas' ? 'text-white' : isFem ? 'text-zinc-500' : 'text-zinc-500'
              }`}
              style={tab === 'ideas' ? { backgroundColor: summary.cat.color } : undefined}
            >
              💡 Ideias{activeIdeas.length > 0 ? ` (${activeIdeas.length})` : ''}
            </button>
          </div>
        </div>

        {/* CONTEÚDO scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-7 py-4">
          {tab === 'projects' ? (
            <ProjectsTab
              theme={theme}
              categoryName={summary.cat.name}
              categoryColor={summary.cat.color}
              projects={projects}
              onUpsertProject={onUpsertProject}
              onDeleteProject={onDeleteProject}
            />
          ) : tab === 'tasks' ? (
            <div className="space-y-4">
              {/* Recurring tasks da frente */}
              {recurringTasks.length > 0 && (
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>
                    🔁 Recorrentes ({recurringTasks.length})
                  </p>
                  <div className="space-y-1.5">
                    {recurringTasks.map((r) => (
                      <div
                        key={r.id}
                        className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                          isFem ? 'bg-rose-50/50' : 'bg-zinc-950'
                        }`}
                      >
                        <span className={`flex-1 ${isFem ? 'text-zinc-800' : 'text-zinc-200'}`}>
                          {r.title}
                        </span>
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest shrink-0 ${
                            isFem ? 'text-rose-400' : 'text-zinc-500'
                          }`}
                        >
                          {frequencyShort(r.frequency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks pendentes */}
              {pendingTasks.length > 0 && (
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>
                    ⏳ Pendentes ({pendingTasks.length})
                  </p>
                  <div className="space-y-1.5">
                    {pendingTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onToggleTask(t.id)}
                        className={`w-full p-3 rounded-xl text-left flex items-start gap-2 transition-all active:scale-[0.98] ${
                          isFem ? 'bg-white border border-zinc-100 hover:bg-rose-50' : 'bg-zinc-950 border border-zinc-800 hover:bg-zinc-900'
                        }`}
                      >
                        <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${isFem ? 'text-zinc-400' : 'text-zinc-600'}`} />
                        <span className={`text-xs font-bold flex-1 ${isFem ? 'text-zinc-900' : 'text-zinc-200'}`}>
                          {t.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent done */}
              {recentDoneTasks.length > 0 && (
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    ✅ Recém-concluídas
                  </p>
                  <div className="space-y-1">
                    {recentDoneTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 opacity-60 ${
                          isFem ? 'bg-rose-50/30' : 'bg-zinc-950'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 shrink-0 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                        <span className={`flex-1 line-through ${isFem ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {t.title}
                        </span>
                        {t.completedAt && (
                          <span className={`text-[9px] uppercase ${isFem ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {format(parseISO(t.completedAt), 'dd/MM', { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingTasks.length === 0 && recurringTasks.length === 0 && (
                <div className="text-center py-10 opacity-60">
                  <Circle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma tarefa nessa frente</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Adicionar nova ideia */}
              <div
                className={`p-3 rounded-xl border-2 border-dashed ${
                  isFem ? 'border-amber-300 bg-amber-50/40' : 'border-amber-700 bg-amber-950/20'
                }`}
              >
                <div className="flex gap-2">
                  <input
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
                    placeholder={`Ideia pra ${summary.cat.name}...`}
                    className={`flex-1 p-3 rounded-xl text-sm font-bold outline-none ${
                      isFem
                        ? 'bg-white text-zinc-900 border border-amber-200 focus:border-amber-400'
                        : 'bg-black text-zinc-100 border border-amber-800 focus:border-amber-600'
                    }`}
                    autoFocus
                  />
                  <button
                    onClick={handleAddIdea}
                    disabled={!newIdea.trim()}
                    className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-white bg-amber-600 active:scale-95 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className={`text-[9px] mt-1 ${isFem ? 'text-amber-700' : 'text-amber-400'}`}>
                  Anotação livre. Use pra rabiscar o que vier à cabeça.
                </p>
              </div>

              {/* Ideias ativas */}
              {activeIdeas.length > 0 ? (
                <div className="space-y-2">
                  {activeIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className={`p-3 rounded-xl flex items-start gap-2 ${
                        isFem ? 'bg-amber-50/40 border border-amber-100' : 'bg-amber-950/20 border border-amber-900/40'
                      }`}
                    >
                      <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${isFem ? 'text-amber-600' : 'text-amber-400'}`} />
                      <p className={`flex-1 text-xs font-bold leading-relaxed ${isFem ? 'text-zinc-900' : 'text-zinc-200'}`}>
                        {idea.text}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onToggleIdea(idea.id)}
                          title="Marcar como aplicada"
                          className={`p-1.5 rounded-lg active:scale-90 ${
                            isFem ? 'text-amber-600 hover:bg-amber-100' : 'text-amber-400 hover:bg-amber-900/40'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteIdea(idea.id)}
                          title="Apagar"
                          className={`p-1.5 rounded-lg active:scale-90 ${
                            isFem ? 'text-zinc-400 hover:text-red-500' : 'text-zinc-500 hover:text-red-400'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 opacity-60">
                  <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-xs font-bold uppercase tracking-widest">Sem ideias ainda</p>
                  <p className="text-[10px] mt-1 opacity-70">
                    Comece anotando algo no campo acima.
                  </p>
                </div>
              )}

              {/* Ideias arquivadas (collapsable visual) */}
              {archivedIdeas.length > 0 && (
                <details className="opacity-60">
                  <summary
                    className={`cursor-pointer text-[10px] font-black uppercase tracking-widest py-2 ${
                      isFem ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    ✅ {archivedIdeas.length} aplicada{archivedIdeas.length > 1 ? 's' : ''}
                  </summary>
                  <div className="space-y-1 mt-2">
                    {archivedIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        className={`p-2.5 rounded-xl flex items-start gap-2 ${
                          isFem ? 'bg-zinc-50' : 'bg-zinc-950'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isFem ? 'text-green-600' : 'text-green-500'}`} />
                        <p className={`flex-1 text-[11px] line-through ${isFem ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {idea.text}
                        </p>
                        <button
                          onClick={() => onToggleIdea(idea.id)}
                          title="Reativar"
                          className="p-1 text-zinc-400 hover:text-amber-500"
                        >
                          ↺
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
