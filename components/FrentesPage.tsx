import React, { useMemo, useState } from 'react';
import { ChevronRight, Lightbulb, Plus } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { CategoryDef, FrenteIdea, FrenteProject, RecurringTask, Task, ThemeType } from '../types';
import { FrenteBottomSheet } from './FrenteBottomSheet';

interface Props {
  theme: ThemeType;
  categories: CategoryDef[];
  recurringTasks: RecurringTask[];
  tasks: Task[];
  ideas: FrenteIdea[];
  projects: FrenteProject[];
  onAddIdea: (categoryName: string, text: string) => void;
  onToggleIdea: (id: string) => void;
  onDeleteIdea: (id: string) => void;
  onToggleTask: (taskId: string) => void;
  onUpsertProject: (project: FrenteProject) => void;
  onDeleteProject: (id: string) => void;
}

interface FrenteSummary {
  cat: CategoryDef;
  daysSince: number | null;
  status: 'green' | 'yellow' | 'orange' | 'red' | 'idle';
  pendingTasks: number;
  ideasCount: number;
  activeProjects: number;
}

const statusFor = (daysSince: number | null) => {
  if (daysSince === null) return 'idle' as const;
  if (daysSince <= 3) return 'green' as const;
  if (daysSince <= 7) return 'yellow' as const;
  if (daysSince <= 10) return 'orange' as const;
  return 'red' as const;
};

const labelDays = (d: number | null) => {
  if (d === null) return '—';
  if (d === 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `${d}d`;
};

export const FrentesPage: React.FC<Props> = ({
  theme,
  categories,
  recurringTasks,
  tasks,
  ideas,
  projects,
  onAddIdea,
  onToggleIdea,
  onDeleteIdea,
  onToggleTask,
  onUpsertProject,
  onDeleteProject
}) => {
  const isFem = theme === 'feminine';
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const today = new Date();

  const summaries = useMemo<FrenteSummary[]>(() => {
    return categories.map((cat) => {
      const matching = tasks.filter(
        (t) => t.completed && t.category?.toLowerCase() === cat.name.toLowerCase()
      );
      let mostRecent: Date | null = null;
      for (const t of matching) {
        const ts = t.completedAt ?? t.scheduledDate;
        const d = parseISO(ts);
        if (!mostRecent || d > mostRecent) mostRecent = d;
      }
      const daysSince = mostRecent ? Math.max(0, differenceInCalendarDays(today, mostRecent)) : null;

      const pendingTasks = tasks.filter(
        (t) => !t.completed && t.category?.toLowerCase() === cat.name.toLowerCase()
      ).length;

      const ideasCount = ideas.filter(
        (i) => !i.done && i.categoryName.toLowerCase() === cat.name.toLowerCase()
      ).length;

      const activeProjects = projects.filter(
        (p) => p.categoryName.toLowerCase() === cat.name.toLowerCase() && p.status !== 'done'
      ).length;

      return { cat, daysSince, status: statusFor(daysSince), pendingTasks, ideasCount, activeProjects };
    });
  }, [categories, tasks, ideas, projects, today]);

  const openSummary = openCategory
    ? summaries.find((s) => s.cat.name === openCategory) ?? null
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between mb-2">
        <p
          className={`text-[10px] font-black uppercase tracking-widest ${
            isFem ? 'text-rose-500' : 'text-zinc-500'
          }`}
        >
          Cada card é uma frente. Toca pra ver tarefas + ideias.
        </p>
      </div>

      {summaries.length === 0 && (
        <div className="text-center py-12 opacity-60">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-xs font-bold uppercase tracking-widest">
            Nenhuma categoria criada ainda.
          </p>
          <p className="text-[10px] opacity-60 mt-1">
            Vai em Rotina → Importar template, ou crie categorias manualmente.
          </p>
        </div>
      )}

      {summaries.map((s) => {
        const isCritical = s.status === 'red';
        const ringCls =
          s.status === 'green'
            ? 'ring-1 ring-green-500/30'
            : s.status === 'yellow'
              ? 'ring-1 ring-yellow-400/40'
              : s.status === 'orange'
                ? 'ring-2 ring-orange-500/60'
                : s.status === 'red'
                  ? 'ring-2 ring-red-500'
                  : 'ring-1 ring-zinc-700/30';

        return (
          <button
            key={s.cat.id}
            onClick={() => setOpenCategory(s.cat.name)}
            className={`w-full flex items-center gap-3 p-4 sm:p-5 rounded-2xl border transition-all active:scale-[0.99] ${
              isFem
                ? 'bg-white border-rose-100 hover:bg-rose-50/30 shadow-md shadow-rose-200/20'
                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
            } ${ringCls} ${isCritical ? 'animate-pulse' : ''}`}
          >
            {/* Bola de cor da frente */}
            <div
              className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-lg"
              style={{ backgroundColor: s.cat.color }}
            >
              {s.cat.name.charAt(0)}
            </div>

            {/* Conteúdo central */}
            <div className="flex-1 min-w-0 text-left">
              <p
                className={`text-sm sm:text-base font-black uppercase truncate ${
                  isFem ? 'text-zinc-900' : 'text-white'
                }`}
              >
                {s.cat.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    s.status === 'red'
                      ? 'text-red-500'
                      : s.status === 'orange'
                        ? 'text-orange-500'
                        : s.status === 'yellow'
                          ? 'text-yellow-500'
                          : s.status === 'green'
                            ? 'text-green-500'
                            : isFem
                              ? 'text-zinc-500'
                              : 'text-zinc-500'
                  }`}
                >
                  ⏱ {labelDays(s.daysSince)}
                </span>
                {s.pendingTasks > 0 && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      isFem ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    📋 {s.pendingTasks} pend.
                  </span>
                )}
                {s.activeProjects > 0 && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      isFem ? 'text-blue-600' : 'text-blue-400'
                    }`}
                  >
                    🚀 {s.activeProjects} proj.
                  </span>
                )}
                {s.ideasCount > 0 && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      isFem ? 'text-amber-600' : 'text-amber-400'
                    }`}
                  >
                    💡 {s.ideasCount} ideia{s.ideasCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight
              className={`w-5 h-5 shrink-0 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`}
            />
          </button>
        );
      })}

      {/* Bottom Sheet quando uma frente é tocada */}
      {openSummary && (
        <FrenteBottomSheet
          theme={theme}
          summary={openSummary}
          recurringTasks={recurringTasks.filter(
            (r) => r.category?.toLowerCase() === openSummary.cat.name.toLowerCase()
          )}
          tasks={tasks.filter(
            (t) => t.category?.toLowerCase() === openSummary.cat.name.toLowerCase()
          )}
          ideas={ideas.filter(
            (i) => i.categoryName.toLowerCase() === openSummary.cat.name.toLowerCase()
          )}
          projects={projects.filter(
            (p) => p.categoryName.toLowerCase() === openSummary.cat.name.toLowerCase()
          )}
          onAddIdea={(text) => onAddIdea(openSummary.cat.name, text)}
          onToggleIdea={onToggleIdea}
          onDeleteIdea={onDeleteIdea}
          onToggleTask={onToggleTask}
          onUpsertProject={onUpsertProject}
          onDeleteProject={onDeleteProject}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  );
};
