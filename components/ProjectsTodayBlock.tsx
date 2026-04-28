import React, { useMemo, useState } from 'react';
import { Check, Circle, Rocket } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';

import { CategoryDef, FrenteProject, ThemeType } from '../types';

interface Props {
  theme: ThemeType;
  projects: FrenteProject[];
  categories: CategoryDef[];
  onUpsertProject: (project: FrenteProject) => void;
}

interface TodayItem {
  project: FrenteProject;
  categoryColor: string;
  startedToday: boolean;
  stepsForToday: { id: string; text: string; done: boolean; dueDate?: string; isLate: boolean }[];
  totalSteps: number;
  doneSteps: number;
  hasLateStep: boolean;
}

/**
 * Bloco "Projetos pra Hoje" — fica entre o FocoDoDia e a Rotina de Hoje na tela /tarefas.
 * Mostra:
 *   - Projetos cuja startDate é hoje (NOVO HOJE)
 *   - Etapas de qualquer projeto cuja dueDate é hoje
 *   - Etapas ATRASADAS (dueDate < hoje e ainda não concluídas) — aparecem destacadas em vermelho
 */
export const ProjectsTodayBlock: React.FC<Props> = ({
  theme,
  projects,
  categories,
  onUpsertProject
}) => {
  const isFem = theme === 'feminine';
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const [collapsed, setCollapsed] = useState(false);

  const catByName = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c])),
    [categories]
  );

  const items = useMemo<TodayItem[]>(() => {
    return projects
      .filter((p) => {
        if (p.status === 'done') return false;
        if (p.status === 'backlog') return false; // Ideia ainda não rola — só aparece se aceito ou já iniciado
        const startedToday = p.startDate === todayKey;
        const hasStepDueOrLate = p.steps.some(
          (s) => s.dueDate && (s.dueDate === todayKey || (s.dueDate < todayKey && !s.done))
        );
        return startedToday || hasStepDueOrLate;
      })
      .map((p) => {
        const cat = catByName.get(p.categoryName.toLowerCase());
        const stepsForToday = p.steps
          .filter((s) => {
            if (!s.dueDate) return false;
            if (s.dueDate === todayKey) return true;            // do dia (done ou não)
            if (s.dueDate < todayKey && !s.done) return true;   // atrasado em aberto
            return false;
          })
          .map((s) => ({
            id: s.id,
            text: s.text,
            done: s.done,
            dueDate: s.dueDate,
            isLate: !!s.dueDate && s.dueDate < todayKey && !s.done
          }));
        const totalSteps = p.steps.length;
        const doneSteps = p.steps.filter((s) => s.done).length;
        const hasLateStep = stepsForToday.some((s) => s.isLate);
        return {
          project: p,
          categoryColor: cat?.color ?? '#71717A',
          startedToday: p.startDate === todayKey,
          stepsForToday,
          totalSteps,
          doneSteps,
          hasLateStep
        };
      });
  }, [projects, todayKey, catByName]);

  if (items.length === 0) return null;

  const totalToday = items.reduce((acc, i) => acc + i.stepsForToday.length, 0);
  const doneToday = items.reduce(
    (acc, i) => acc + i.stepsForToday.filter((s) => s.done).length,
    0
  );

  const toggleStep = (project: FrenteProject, stepId: string) => {
    const updatedSteps = project.steps.map((s) => {
      if (s.id !== stepId) return s;
      const next = !s.done;
      if (next) return { ...s, done: true, completedAt: new Date().toISOString() };
      const { completedAt, ...rest } = s;
      return { ...rest, done: false };
    });
    // auto-status
    const total = updatedSteps.length;
    const doneCount = updatedSteps.filter((s) => s.done).length;
    let nextStatus = project.status;
    if ((project.status === 'backlog' || project.status === 'accepted') && doneCount > 0) nextStatus = 'doing';
    if (total > 0 && doneCount === total && project.status !== 'done') nextStatus = 'done';
    onUpsertProject({
      ...project,
      steps: updatedSteps,
      status: nextStatus,
      startedAt:
        nextStatus === 'doing' && !project.startedAt
          ? new Date().toISOString()
          : project.startedAt,
      completedAt:
        nextStatus === 'done' ? new Date().toISOString() : project.completedAt
    });
  };

  return (
    <section
      className={`rounded-2xl sm:rounded-[2rem] border p-4 sm:p-5 ${
        isFem
          ? 'bg-white border-rose-100 shadow-md shadow-rose-200/30'
          : 'bg-zinc-900/60 border-zinc-800'
      }`}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-3 mb-3"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isFem ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-400'
            }`}
          >
            <Rocket className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3
              className={`text-sm sm:text-base font-black italic uppercase ${
                isFem ? 'text-zinc-900' : 'text-white'
              }`}
            >
              Projetos pra Hoje
            </h3>
            <p
              className={`text-[10px] font-black uppercase tracking-widest ${
                isFem ? 'text-rose-400' : 'text-zinc-500'
              }`}
            >
              {items.length} projeto{items.length > 1 ? 's' : ''}
              {totalToday > 0 && ` · ${doneToday}/${totalToday} etapas hoje`}
            </p>
          </div>
        </div>
        <span className={`text-xs font-black ${isFem ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {collapsed ? '▾' : '▴'}
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-3">
          {items.map((item) => {
            const pct = item.totalSteps > 0 ? Math.round((item.doneSteps / item.totalSteps) * 100) : 0;
            return (
              <div
                key={item.project.id}
                className={`p-3 rounded-xl border-l-4 ${
                  isFem ? 'bg-rose-50/30' : 'bg-zinc-950'
                }`}
                style={{ borderLeftColor: item.categoryColor }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-black uppercase truncate ${
                        isFem ? 'text-zinc-900' : 'text-zinc-100'
                      }`}
                    >
                      {item.project.title}
                    </p>
                    <p
                      className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                        isFem ? 'text-zinc-500' : 'text-zinc-500'
                      }`}
                    >
                      {item.startedToday && '🆕 INICIA HOJE · '}
                      {item.project.categoryName} · {pct}% ({item.doneSteps}/{item.totalSteps})
                    </p>
                  </div>
                </div>

                {item.stepsForToday.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {item.stepsForToday.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleStep(item.project, s.id)}
                        className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all active:scale-[0.98] ${
                          s.done
                            ? 'opacity-50'
                            : s.isLate
                              ? isFem
                                ? 'bg-red-50 hover:bg-red-100 border border-red-300'
                                : 'bg-red-950/40 hover:bg-red-900/40 border border-red-800'
                              : isFem
                                ? 'bg-white hover:bg-rose-50'
                                : 'bg-zinc-900 hover:bg-zinc-800'
                        }`}
                      >
                        {s.done ? (
                          <Check
                            className="w-4 h-4 shrink-0 mt-0.5"
                            style={{ color: item.categoryColor }}
                            strokeWidth={3}
                          />
                        ) : (
                          <Circle
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              s.isLate
                                ? 'text-red-500'
                                : isFem
                                  ? 'text-zinc-400'
                                  : 'text-zinc-600'
                            }`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-xs font-bold leading-snug block ${
                              s.done
                                ? 'line-through ' + (isFem ? 'text-zinc-500' : 'text-zinc-500')
                                : isFem
                                  ? 'text-zinc-900'
                                  : 'text-zinc-200'
                            }`}
                          >
                            {s.text}
                          </span>
                          {s.isLate && s.dueDate && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500 mt-0.5 block">
                              ⚠ Atrasado desde {format(parseISO(s.dueDate), 'dd/MM')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`text-[10px] mt-1 italic ${isFem ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Sem etapas marcadas pra hoje. Abra o projeto e use o botão "Pra hoje" nas etapas.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
