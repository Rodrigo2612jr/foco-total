import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Repeat } from 'lucide-react';
import { parseISO, isSameDay } from 'date-fns';

import { CategoryDef, Task, ThemeType } from '../types';

interface Props {
  theme: ThemeType;
  filterDate: string; // 'yyyy-MM-dd'
  tasks: Task[];
  categories: CategoryDef[];
  onToggle: (taskId: string) => void;
}

/**
 * Bloco compacto "Rotina de Hoje" — mostra as tarefas recorrentes do dia
 * agrupadas por categoria (com cor), acima da lista geral de tarefas.
 * Ajuda no check-in matinal.
 */
export const TodaysRoutineBlock: React.FC<Props> = ({
  theme,
  filterDate,
  tasks,
  categories,
  onToggle
}) => {
  const isFem = theme === 'feminine';
  const target = parseISO(filterDate + 'T12:00:00');

  const todaysRoutine = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.recurringTaskId &&
          isSameDay(parseISO(t.scheduledDate), target)
      ),
    [tasks, target]
  );

  const catByName = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c])),
    [categories]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    todaysRoutine.forEach((t) => {
      const key = (t.category ?? 'Sem categoria').toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    });
    return Array.from(map.entries())
      .map(([key, list]) => ({
        key,
        label: list[0].category ?? 'Sem categoria',
        color: catByName.get(key)?.color ?? (isFem ? '#E11D48' : '#2563EB'),
        tasks: list
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [todaysRoutine, catByName, isFem]);

  if (todaysRoutine.length === 0) return null;

  const total = todaysRoutine.length;
  const done = todaysRoutine.filter((t) => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section
      className={`rounded-2xl sm:rounded-[2.5rem] border p-4 sm:p-6 ${
        isFem
          ? 'bg-white border-rose-100 shadow-xl shadow-rose-200/20'
          : 'bg-zinc-900/60 border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
            <Repeat className={`w-4 h-4 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
          </div>
          <div>
            <h3
              className={`text-sm sm:text-base font-black italic uppercase ${
                isFem ? 'text-rose-700' : 'text-white'
              }`}
            >
              Rotina de Hoje
            </h3>
            <p
              className={`text-[9px] font-black uppercase tracking-widest ${
                isFem ? 'text-rose-400' : 'text-zinc-500'
              }`}
            >
              {done}/{total} concluídas • {pct}%
            </p>
          </div>
        </div>
        <div
          className={`h-2 flex-1 max-w-[120px] rounded-full overflow-hidden ${
            isFem ? 'bg-rose-100' : 'bg-zinc-800'
          }`}
        >
          <div
            className={`h-full ${isFem ? 'bg-rose-600' : 'bg-blue-500'} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  isFem ? 'text-rose-600' : 'text-zinc-400'
                }`}
              >
                {group.label}
              </span>
              <span
                className={`text-[8px] font-black uppercase tracking-widest ml-auto ${
                  isFem ? 'text-rose-400' : 'text-zinc-600'
                }`}
              >
                {group.tasks.filter((t) => t.completed).length}/{group.tasks.length}
              </span>
            </div>
            <div className="space-y-1.5 ml-4">
              {group.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`w-full flex items-center gap-2 p-2 sm:p-2.5 rounded-xl text-left transition-all active:scale-[0.98] ${
                    t.completed
                      ? isFem
                        ? 'bg-rose-50/50 opacity-60'
                        : 'bg-zinc-900/60 opacity-50'
                      : isFem
                        ? 'bg-rose-50/30 hover:bg-rose-50'
                        : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {t.completed ? (
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        isFem ? 'text-rose-600' : 'text-blue-500'
                      }`}
                    />
                  ) : (
                    <Circle
                      className={`w-4 h-4 shrink-0 ${
                        isFem ? 'text-rose-300' : 'text-zinc-600'
                      }`}
                    />
                  )}
                  <span
                    className={`text-[11px] sm:text-xs font-bold uppercase tracking-tight truncate ${
                      t.completed
                        ? 'line-through ' + (isFem ? 'text-rose-400' : 'text-zinc-500')
                        : isFem
                          ? 'text-zinc-800'
                          : 'text-zinc-200'
                    }`}
                  >
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
