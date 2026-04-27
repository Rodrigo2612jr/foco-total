import React, { useEffect, useMemo, useState } from 'react';
import { Check, Circle, Star } from 'lucide-react';
import { format, nextSaturday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { ThemeType } from '../types';

interface Props {
  theme: ThemeType;
  username: string;
}

// Checklist contextual da degustação (não persiste no Firestore — só localStorage)
const CHECKLIST = [
  'Confirmar fornecedor pra sábado',
  'Definir produto/sabor da degustação',
  'Preparar amostras (separar / temperar / embalar)',
  'Avisar Grupo VIP no WhatsApp',
  'Postar story Instagram convidando',
  'Conferir embalagens e copinhos',
  'Brifar equipe sobre script de venda'
];

// Decide se o "Modo Sábado" está ativo:
// - Sexta a partir das 17h (você terminou de planejar, hora de preparar)
// - Sábado o dia todo (durante a degustação)
const isModoSabadoActive = (now: Date): boolean => {
  const dow = now.getDay();
  if (dow === 5 && now.getHours() >= 17) return true; // sexta após 17h
  if (dow === 6) return true; // sábado
  return false;
};

// Calcula a data do sábado relevante (pra chave do localStorage)
const getSabadoKey = (now: Date): string => {
  if (now.getDay() === 6) return format(now, 'yyyy-MM-dd'); // já é sábado
  // Sexta após 17h → sábado é amanhã
  return format(nextSaturday(startOfDay(now)), 'yyyy-MM-dd');
};

export const ModoSabadoCard: React.FC<Props> = ({ theme, username }) => {
  const isFem = theme === 'feminine';
  const now = new Date();
  const active = isModoSabadoActive(now);
  const sabadoKey = useMemo(() => getSabadoKey(now), []);
  const storageKey = `focototal:modoSabado:${username}:${sabadoKey}`;

  const [checked, setChecked] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return new Set<number>(JSON.parse(raw));
    } catch {
      /* noop */
    }
    return new Set<number>();
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(checked)));
    } catch {
      /* noop */
    }
  }, [checked, storageKey]);

  if (!active) return null;

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const done = checked.size;
  const total = CHECKLIST.length;
  const pct = Math.round((done / total) * 100);
  const dow = now.getDay();
  const isSaturday = dow === 6;
  const subtitle = isSaturday
    ? `É hoje! ${done}/${total} prontos · ${pct}%`
    : `Amanhã é dia! Preparar tudo · ${done}/${total} feitos`;

  return (
    <section
      className={`relative rounded-2xl sm:rounded-[2rem] border-2 overflow-hidden ${
        isSaturday
          ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40'
          : 'border-amber-400 bg-gradient-to-br from-amber-50/60 to-yellow-50/60 dark:from-amber-950/30 dark:to-yellow-950/30'
      }`}
      style={{
        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)'
      }}
    >
      {/* Header dourado */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-4 sm:p-5 active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-2xl">
            ⭐
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
              {isSaturday ? '🎉 Modo sábado ativo' : '🌅 Preparação pra amanhã'}
            </p>
            <h3 className="text-base sm:text-lg font-black uppercase text-amber-900 dark:text-amber-100">
              Degustação na Loja
            </h3>
            <p className="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-2 w-14 sm:w-20 rounded-full overflow-hidden bg-amber-200 dark:bg-amber-900/60">
            <div
              className="h-full bg-amber-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-amber-700 dark:text-amber-300 text-xs font-black">
            {collapsed ? '▾' : '▴'}
          </span>
        </div>
      </button>

      {/* Checklist */}
      {!collapsed && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-1.5">
          {CHECKLIST.map((item, i) => {
            const isDone = checked.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                  isDone
                    ? 'bg-amber-100/60 dark:bg-amber-900/30 opacity-60'
                    : 'bg-white/80 dark:bg-zinc-900/60 hover:bg-amber-50 dark:hover:bg-zinc-900'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {isDone ? (
                    <Check className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={3} />
                  ) : (
                    <Circle className="w-5 h-5 text-amber-400 dark:text-amber-700" />
                  )}
                </span>
                <span
                  className={`text-sm font-bold leading-snug flex-1 ${
                    isDone
                      ? 'line-through text-amber-700 dark:text-amber-500'
                      : 'text-amber-900 dark:text-amber-100'
                  }`}
                >
                  {item}
                </span>
              </button>
            );
          })}

          {done === total && (
            <div className="mt-3 p-3 rounded-xl bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-green-800 dark:text-green-300">
                🎉 Tudo pronto pro sábado! Bom evento!
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
