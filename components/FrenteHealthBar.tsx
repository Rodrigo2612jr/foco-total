import React, { useMemo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { CategoryDef, Task, ThemeType } from '../types';

interface Props {
  theme: ThemeType;
  categories: CategoryDef[];
  tasks: Task[];
  onPickFrente?: (categoryName: string) => void;
}

interface FrenteHealth {
  cat: CategoryDef;
  daysSince: number | null; // null = nunca tocou
  status: 'green' | 'yellow' | 'orange' | 'red' | 'idle';
}

const statusFor = (daysSince: number | null): FrenteHealth['status'] => {
  if (daysSince === null) return 'idle';
  if (daysSince <= 3) return 'green';
  if (daysSince <= 7) return 'yellow';
  if (daysSince <= 10) return 'orange';
  return 'red';
};

const labelDays = (d: number | null): string => {
  if (d === null) return '—';
  if (d === 0) return 'hoje';
  if (d === 1) return '1d';
  return `${d}d`;
};

/**
 * Health Bar: 7 dots no topo do dashboard mostrando saúde de cada frente.
 * "Saúde" = quantos dias se passaram desde a última task concluída dessa categoria.
 *
 * Inspirado no padrão Linear (status indicators) + Sunsama (foco do dia).
 */
export const FrenteHealthBar: React.FC<Props> = ({ theme, categories, tasks, onPickFrente }) => {
  const isFem = theme === 'feminine';
  const today = new Date();

  const frentes = useMemo<FrenteHealth[]>(() => {
    return categories.map((cat) => {
      // Procura última task concluída dessa categoria (compara nome — fallback)
      const matching = tasks.filter(
        (t) =>
          t.completed &&
          (t.completedAt || t.scheduledDate) &&
          (t.category?.toLowerCase() === cat.name.toLowerCase())
      );
      if (matching.length === 0) {
        return { cat, daysSince: null, status: 'idle' as const };
      }
      // Pega o mais recente (completedAt > scheduledDate como fallback)
      let mostRecent: Date | null = null;
      for (const t of matching) {
        const ts = t.completedAt ?? t.scheduledDate;
        const d = parseISO(ts);
        if (!mostRecent || d > mostRecent) mostRecent = d;
      }
      if (!mostRecent) return { cat, daysSince: null, status: 'idle' as const };
      const days = differenceInCalendarDays(today, mostRecent);
      return { cat, daysSince: Math.max(0, days), status: statusFor(days) };
    });
  }, [categories, tasks, today]);

  if (categories.length === 0) return null;

  return (
    <div
      className={`rounded-2xl p-3 sm:p-4 border ${
        isFem ? 'bg-white/60 border-rose-100' : 'bg-zinc-900/60 border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className={`text-[10px] font-black uppercase tracking-widest ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}>
          Saúde das Frentes
        </p>
        <p className={`text-[9px] uppercase ${isFem ? 'text-rose-300' : 'text-zinc-600'}`}>
          dias desde último avanço
        </p>
      </div>
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {frentes.map((f) => {
          const isCritical = f.status === 'red';
          const isWarn = f.status === 'orange';
          const baseRing =
            f.status === 'green'
              ? 'ring-2 ring-green-500/30'
              : f.status === 'yellow'
                ? 'ring-2 ring-yellow-400/40'
                : f.status === 'orange'
                  ? 'ring-2 ring-orange-500/60'
                  : f.status === 'red'
                    ? 'ring-2 ring-red-500'
                    : 'ring-1 ring-zinc-700/30';

          return (
            <button
              key={f.cat.id}
              onClick={() => onPickFrente?.(f.cat.name)}
              title={`${f.cat.name} — ${f.daysSince === null ? 'nunca tocou' : `${f.daysSince} dia(s) atrás`}`}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all active:scale-95 ${baseRing} ${isCritical ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: f.cat.color + '22' }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: f.cat.color }}
              />
              <span
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  isFem ? 'text-zinc-800' : 'text-zinc-200'
                }`}
              >
                {f.cat.name.split('/')[0]}
              </span>
              <span
                className={`text-[8px] sm:text-[9px] font-black ${
                  isCritical
                    ? 'text-red-500'
                    : isWarn
                      ? 'text-orange-500'
                      : isFem
                        ? 'text-zinc-500'
                        : 'text-zinc-500'
                }`}
              >
                {labelDays(f.daysSince)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Componente "Foco do Dia": pega a frente em pior estado e mostra
 * um card destacado convidando à ação.
 */
export const FocoDoDiaCard: React.FC<{
  theme: ThemeType;
  categories: CategoryDef[];
  tasks: Task[];
  onPickFrente?: (categoryName: string) => void;
}> = ({ theme, categories, tasks, onPickFrente }) => {
  const isFem = theme === 'feminine';
  const today = new Date();

  const focus = useMemo<FrenteHealth | null>(() => {
    if (categories.length === 0) return null;
    const all: FrenteHealth[] = categories.map((cat) => {
      const matching = tasks.filter(
        (t) => t.completed && t.category?.toLowerCase() === cat.name.toLowerCase()
      );
      if (matching.length === 0) return { cat, daysSince: null, status: 'idle' as const };
      let mostRecent: Date | null = null;
      for (const t of matching) {
        const ts = t.completedAt ?? t.scheduledDate;
        const d = parseISO(ts);
        if (!mostRecent || d > mostRecent) mostRecent = d;
      }
      const days = mostRecent ? differenceInCalendarDays(today, mostRecent) : null;
      return { cat, daysSince: days, status: statusFor(days) };
    });
    // Pega a pior (red > orange > yellow). Ignora idle (sem dados).
    const order = { red: 4, orange: 3, yellow: 2, green: 1, idle: 0 };
    const sorted = all
      .filter((f) => f.status !== 'idle' && f.status !== 'green')
      .sort((a, b) => {
        const orderDiff = order[b.status] - order[a.status];
        if (orderDiff !== 0) return orderDiff;
        return (b.daysSince ?? 0) - (a.daysSince ?? 0);
      });
    return sorted[0] ?? null;
  }, [categories, tasks, today]);

  if (!focus) return null;

  const dias = focus.daysSince ?? 0;
  const message =
    focus.status === 'red'
      ? `${dias} dias sem tocar. Bora mexer?`
      : focus.status === 'orange'
        ? `${dias} dias sem mexer. Que tal hoje?`
        : `${dias} dias atrás. Vale uma olhada.`;

  return (
    <button
      onClick={() => onPickFrente?.(focus.cat.name)}
      className={`w-full rounded-2xl p-4 sm:p-5 border-2 text-left transition-all active:scale-[0.99] ${
        focus.status === 'red'
          ? 'border-red-500 bg-red-500/5'
          : focus.status === 'orange'
            ? 'border-orange-500 bg-orange-500/5'
            : 'border-yellow-500/60 bg-yellow-500/5'
      }`}
      style={{ boxShadow: `0 4px 20px ${focus.cat.color}22` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: focus.cat.color }} />
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>
            Foco sugerido pro dia
          </p>
          <p className={`text-base sm:text-lg font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>
            {focus.cat.name}
          </p>
          <p className={`text-[11px] sm:text-xs mt-1 ${isFem ? 'text-zinc-700' : 'text-zinc-300'}`}>
            {message}
          </p>
        </div>
      </div>
    </button>
  );
};
