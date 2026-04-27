import React, { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Sparkles } from 'lucide-react';
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
  startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { CategoryDef, RecurringTask, Task, ThemeType } from '../types';
import { isRecurringDueOnDate } from '../services/recurringService';

interface Props {
  theme: ThemeType;
  categories: CategoryDef[];
  recurringTasks: RecurringTask[];
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

interface DayInfo {
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  theme: { label: string; emoji: string };
  // Recorrentes que tocam nesse dia (sejam já geradas como tasks ou ainda só projetadas)
  recurringTitles: { id: string; title: string; categoryName?: string; categoryColor?: string }[];
  // Tarefas avulsas agendadas pra esse dia
  avulsasTasks: Task[];
  // Concluído/total contagem
  doneCount: number;
  totalCount: number;
  hasOverdueOriginallyHere: boolean;
}

const DAY_THEME: { [k: number]: { label: string; emoji: string } } = {
  0: { label: 'Off', emoji: '💤' },
  1: { label: 'Planejamento', emoji: '🎯' },
  2: { label: 'Alinhamento', emoji: '🤝' },
  3: { label: 'Financeiro', emoji: '💰' },
  4: { label: 'Operação', emoji: '🛒' },
  5: { label: 'Análise', emoji: '📊' },
  6: { label: 'Loja + Degustação', emoji: '⭐' }
};

export const SemanaPage: React.FC<Props> = ({
  theme,
  categories,
  recurringTasks,
  tasks,
  onToggleTask
}) => {
  const isFem = theme === 'feminine';
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const catByName = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c])),
    [categories]
  );

  const days = useMemo<DayInfo[]>(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = startOfDay(addDays(weekStart, i));
      const dow = date.getDay();

      // Tarefas avulsas (sem recurringTaskId) agendadas pra esse dia
      const avulsasTasks = tasks.filter(
        (t) => !t.recurringTaskId && isSameDay(parseISO(t.scheduledDate), date)
      );

      // Recorrentes que tocam nesse dia
      const recurringTitles = recurringTasks
        .filter((r) => isRecurringDueOnDate(r, date))
        .map((r) => {
          const cat = r.category ? catByName.get(r.category.toLowerCase()) : undefined;
          return {
            id: r.id,
            title: r.title,
            categoryName: r.category,
            categoryColor: cat?.color
          };
        });

      // Concluído/total: usa tasks reais (avulsas + instâncias geradas dessa data)
      const dayTasks = tasks.filter((t) => isSameDay(parseISO(t.scheduledDate), date));
      const totalCount = dayTasks.length + Math.max(0, recurringTitles.length - dayTasks.filter(t => t.recurringTaskId).length);
      const doneCount = dayTasks.filter((t) => t.completed).length;

      return {
        date,
        isToday: isToday(date),
        isWeekend: dow === 0 || dow === 6,
        theme: DAY_THEME[dow],
        recurringTitles,
        avulsasTasks,
        doneCount,
        totalCount,
        hasOverdueOriginallyHere: dayTasks.some(
          (t) => !t.completed && t.recurringTaskId && date < startOfDay(today)
        )
      };
    });
  }, [weekStart, recurringTasks, tasks, catByName, today]);

  const selected = selectedDay !== null ? days[selectedDay] : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <p
          className={`text-[10px] font-black uppercase tracking-widest ${
            isFem ? 'text-rose-500' : 'text-zinc-500'
          }`}
        >
          {format(weekStart, "'Semana de' dd 'de' MMM", { locale: ptBR })}
        </p>
        <p className={`text-[9px] uppercase ${isFem ? 'text-rose-300' : 'text-zinc-600'}`}>
          {days.reduce((acc, d) => acc + d.doneCount, 0)}/
          {days.reduce((acc, d) => acc + d.totalCount, 0)} concluídas
        </p>
      </div>

      {/* Cards dos dias */}
      <div className="space-y-2">
        {days.map((d, idx) => {
          const isOff = d.date.getDay() === 0; // Domingo
          const pct = d.totalCount > 0 ? Math.round((d.doneCount / d.totalCount) * 100) : 0;
          const dayLabel = format(d.date, "EEEE, dd 'de' MMM", { locale: ptBR });
          const isPast = d.date < startOfDay(today) && !d.isToday;

          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx)}
              disabled={d.totalCount === 0 && !d.isToday}
              className={`w-full text-left rounded-2xl p-4 sm:p-5 border transition-all active:scale-[0.99] ${
                d.isToday
                  ? isFem
                    ? 'bg-rose-50 border-rose-300 shadow-lg shadow-rose-200/40 ring-2 ring-rose-400'
                    : 'bg-blue-950/30 border-blue-700 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500'
                  : isOff
                    ? isFem
                      ? 'bg-zinc-50 border-zinc-100 opacity-50'
                      : 'bg-zinc-950 border-zinc-900 opacity-40'
                    : isPast
                      ? isFem
                        ? 'bg-white border-zinc-100 opacity-70'
                        : 'bg-zinc-900/40 border-zinc-800 opacity-70'
                      : isFem
                        ? 'bg-white border-rose-100 hover:bg-rose-50/30'
                        : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center ${
                      d.isToday
                        ? isFem
                          ? 'bg-rose-600 text-white'
                          : 'bg-blue-600 text-white'
                        : isFem
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="text-[8px] font-black uppercase">
                      {format(d.date, 'EEE', { locale: ptBR }).replace('.', '').slice(0, 3)}
                    </span>
                    <span className="text-base font-black leading-none">
                      {format(d.date, 'dd')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm font-black uppercase truncate ${
                        isFem ? 'text-zinc-900' : 'text-zinc-100'
                      }`}
                    >
                      {d.theme.emoji} {d.theme.label}
                      {d.isToday && (
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-[8px] font-black ${
                            isFem ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          HOJE
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                        isFem ? 'text-rose-400' : 'text-zinc-500'
                      }`}
                    >
                      {isOff
                        ? 'descanso — sem tarefas'
                        : `${d.totalCount} ${d.totalCount === 1 ? 'tarefa' : 'tarefas'}${d.totalCount > 0 ? ` · ${pct}% feito` : ''}`}
                    </p>
                  </div>
                </div>
                {d.totalCount > 0 && (
                  <div
                    className={`shrink-0 h-2 w-14 rounded-full overflow-hidden ${
                      isFem ? 'bg-rose-100' : 'bg-zinc-800'
                    }`}
                  >
                    <div
                      className={`h-full transition-all ${isFem ? 'bg-rose-600' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                <ChevronRight
                  className={`w-4 h-4 shrink-0 ${isFem ? 'text-rose-300' : 'text-zinc-600'} ${
                    d.totalCount === 0 && !d.isToday ? 'opacity-0' : ''
                  }`}
                />
              </div>

              {/* Preview das primeiras 3 tarefas */}
              {!isOff && d.totalCount > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    ...d.recurringTitles.slice(0, 3).map((r) => ({ title: r.title, color: r.categoryColor })),
                    ...d.avulsasTasks.slice(0, 2).map((a) => ({
                      title: a.title,
                      color: catByName.get((a.category ?? '').toLowerCase())?.color
                    }))
                  ]
                    .slice(0, 4)
                    .map((item, i) => (
                      <span
                        key={i}
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isFem ? 'bg-rose-50 text-rose-700' : 'bg-zinc-800 text-zinc-300'
                        }`}
                        style={
                          item.color
                            ? { borderLeft: `3px solid ${item.color}` }
                            : undefined
                        }
                      >
                        {item.title.length > 32 ? item.title.slice(0, 32) + '…' : item.title}
                      </span>
                    ))}
                  {d.totalCount > 4 && (
                    <span
                      className={`text-[9px] font-black uppercase ${
                        isFem ? 'text-rose-400' : 'text-zinc-500'
                      }`}
                    >
                      +{d.totalCount - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom sheet do dia selecionado */}
      {selected && (
        <DayDetailSheet
          theme={theme}
          day={selected}
          tasks={tasks}
          categories={categories}
          onToggleTask={onToggleTask}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
};

// =================== DETALHE DO DIA (bottom sheet) ===================
const DayDetailSheet: React.FC<{
  theme: ThemeType;
  day: DayInfo;
  tasks: Task[];
  categories: CategoryDef[];
  onToggleTask: (id: string) => void;
  onClose: () => void;
}> = ({ theme, day, tasks, categories, onToggleTask, onClose }) => {
  const isFem = theme === 'feminine';
  const dayTasks = tasks.filter((t) => isSameDay(parseISO(t.scheduledDate), day.date));
  const recurringInstances = dayTasks.filter((t) => t.recurringTaskId);
  const avulsas = dayTasks.filter((t) => !t.recurringTaskId);
  const projected = day.recurringTitles.filter(
    (r) => !recurringInstances.some((t) => t.recurringTaskId === r.id)
  );

  const panelCls = `relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] border mobile-modal-content-sheet sm:!max-h-[85vh] sm:!position-static sm:!rounded-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden ${
    isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
  }`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={panelCls}>
        {/* Header */}
        <div
          className={`shrink-0 px-5 sm:px-7 pt-5 sm:pt-6 pb-3 border-b ${
            isFem ? 'border-rose-100' : 'border-zinc-800'
          }`}
        >
          <div className="pull-indicator sm:hidden" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
              <h3
                className={`text-base sm:text-lg font-black uppercase ${
                  isFem ? 'text-rose-700' : 'text-white'
                }`}
              >
                {format(day.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`p-2 ${isFem ? 'text-rose-300' : 'text-zinc-600'} hover:opacity-70`}
            >
              ✕
            </button>
          </div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>
            {day.theme.emoji} Tema do dia: {day.theme.label}
          </p>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 space-y-4">
          {/* Recorrentes já geradas (instâncias) */}
          {recurringInstances.length > 0 && (
            <div>
              <p
                className={`text-[9px] font-black uppercase tracking-widest mb-2 ${
                  isFem ? 'text-rose-500' : 'text-zinc-500'
                }`}
              >
                🔁 Rotina ({recurringInstances.length})
              </p>
              <div className="space-y-1.5">
                {recurringInstances.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onToggleTask(t.id)}
                    className={`w-full p-3 rounded-xl text-left flex items-center gap-2 transition-all active:scale-[0.98] ${
                      t.completed
                        ? isFem
                          ? 'bg-rose-50/50 opacity-60'
                          : 'bg-zinc-950 opacity-50'
                        : isFem
                          ? 'bg-white border border-rose-100 hover:bg-rose-50'
                          : 'bg-zinc-950 border border-zinc-800 hover:bg-zinc-900'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full shrink-0 ${
                        t.completed
                          ? isFem
                            ? 'bg-rose-600'
                            : 'bg-blue-600'
                          : isFem
                            ? 'border-2 border-rose-300'
                            : 'border-2 border-zinc-600'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold flex-1 ${
                        t.completed
                          ? 'line-through ' + (isFem ? 'text-zinc-400' : 'text-zinc-500')
                          : isFem
                            ? 'text-zinc-900'
                            : 'text-zinc-200'
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Avulsas do dia */}
          {avulsas.length > 0 && (
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>
                🎯 Avulsas ({avulsas.length})
              </p>
              <div className="space-y-1.5">
                {avulsas.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onToggleTask(t.id)}
                    className={`w-full p-3 rounded-xl text-left flex items-center gap-2 transition-all active:scale-[0.98] ${
                      t.completed
                        ? isFem
                          ? 'bg-rose-50/50 opacity-60'
                          : 'bg-zinc-950 opacity-50'
                        : isFem
                          ? 'bg-white border border-rose-100 hover:bg-rose-50'
                          : 'bg-zinc-950 border border-zinc-800 hover:bg-zinc-900'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full shrink-0 ${
                        t.completed
                          ? isFem
                            ? 'bg-rose-600'
                            : 'bg-blue-600'
                          : isFem
                            ? 'border-2 border-rose-300'
                            : 'border-2 border-zinc-600'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold flex-1 ${
                        t.completed
                          ? 'line-through ' + (isFem ? 'text-zinc-400' : 'text-zinc-500')
                          : isFem
                            ? 'text-zinc-900'
                            : 'text-zinc-200'
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recorrentes futuras (ainda não geradas) */}
          {projected.length > 0 && (
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isFem ? 'text-zinc-500' : 'text-zinc-500'}`}>
                <Sparkles className="w-3 h-3 inline mr-1" />
                A gerar nesse dia ({projected.length})
              </p>
              <div className="space-y-1">
                {projected.map((p) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl flex items-center gap-2 opacity-60 ${
                      isFem ? 'bg-rose-50/30 border border-dashed border-rose-200' : 'bg-zinc-950 border border-dashed border-zinc-700'
                    }`}
                  >
                    {p.categoryColor && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.categoryColor }}
                      />
                    )}
                    <span className={`text-[11px] font-bold flex-1 ${isFem ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      {p.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dayTasks.length === 0 && projected.length === 0 && (
            <div className="text-center py-12 opacity-60">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Nenhuma tarefa nesse dia
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
