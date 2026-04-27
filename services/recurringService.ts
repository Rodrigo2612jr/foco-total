import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  subDays
} from 'date-fns';

import {
  CategoryDef,
  Frequency,
  RecurringGenerationLog,
  RecurringTask,
  Task
} from '../types';

export const toDateKey = (d: Date): string => format(d, 'yyyy-MM-dd');

// ---------- Decisão: esta recorrente "toca" nesse dia? ----------
export const isRecurringDueOnDate = (rec: RecurringTask, date: Date): boolean => {
  if (!rec.active) return false;

  // Excluir dias específicos da semana (ex: Financeiro excluindo sáb/dom)
  if (Array.isArray(rec.excludedDaysOfWeek) && rec.excludedDaysOfWeek.includes(date.getDay())) {
    return false;
  }

  switch (rec.frequency) {
    case 'daily':
      return true;

    case 'weekly': {
      // Múltiplos dias tem prioridade sobre dayOfWeek (legado)
      if (Array.isArray(rec.daysOfWeek) && rec.daysOfWeek.length > 0) {
        return rec.daysOfWeek.includes(date.getDay());
      }
      return typeof rec.dayOfWeek === 'number' && date.getDay() === rec.dayOfWeek;
    }

    case 'biweekly': {
      // Toca em dia da semana específico, a cada 14 dias.
      // Pega o dia da semana base (preferência: dayOfWeek; senão usa Date(referenceDate).getDay()).
      const targetDow =
        typeof rec.dayOfWeek === 'number'
          ? rec.dayOfWeek
          : rec.referenceDate
            ? parseISO(rec.referenceDate).getDay()
            : 1; // default segunda
      if (date.getDay() !== targetDow) return false;

      // Calcula se está numa "semana ativa" (multiplo de 14 desde referenceDate)
      const ref = rec.referenceDate ? startOfDay(parseISO(rec.referenceDate)) : startOfDay(parseISO(rec.createdAt));
      const diffDays = differenceInCalendarDays(startOfDay(date), ref);
      // diffDays % 14 === 0 → toca nesse dia
      return diffDays >= 0 && diffDays % 14 === 0;
    }

    case 'monthly': {
      if (typeof rec.dayOfMonth !== 'number') return false;
      const lastDay = endOfMonth(date).getDate();
      // Regra: se dayOfMonth não existir no mês (ex: 31 em fevereiro),
      // a recorrente cai no ÚLTIMO dia do mês.
      const effectiveDay = Math.min(rec.dayOfMonth, lastDay);
      return date.getDate() === effectiveDay;
    }

    default:
      return false;
  }
};

// ---------- Converter uma recorrente em uma Task "instância" do dia ----------
const buildTaskInstance = (
  rec: RecurringTask,
  date: Date,
  categories: CategoryDef[]
): Task => {
  // Resolve nome da categoria a partir de categoryId (preferencial) ou fallback
  const cat = rec.categoryId ? categories.find((c) => c.id === rec.categoryId) : undefined;
  const categoryName = cat?.name ?? rec.category ?? 'Outros';

  // scheduledDate fixado ao meio-dia para evitar confusão de fuso
  const scheduledDate = format(date, 'yyyy-MM-dd') + 'T12:00:00';

  return {
    id: crypto.randomUUID(),
    title: rec.title,
    completed: false,
    scheduledDate,
    createdAt: new Date().toISOString(),
    category: categoryName,
    recurringTaskId: rec.id
  };
};

// ---------- Gera instâncias do dia sem duplicar ----------
export const generateInstancesForDate = (params: {
  date: Date;
  recurringTasks: RecurringTask[];
  existingTasks: Task[];
  log: RecurringGenerationLog;
  categories: CategoryDef[];
}): { newTasks: Task[]; updatedLog: RecurringGenerationLog } => {
  const { date, recurringTasks, existingTasks, log, categories } = params;
  const key = toDateKey(date);
  const alreadyGenerated = new Set(log[key] ?? []);

  // Também previne duplicação olhando pras tasks existentes (defesa extra)
  const existingByRecOnDate = new Set(
    existingTasks
      .filter(
        (t) =>
          t.recurringTaskId &&
          isSameDay(parseISO(t.scheduledDate), date)
      )
      .map((t) => t.recurringTaskId!)
  );

  const due = recurringTasks.filter((rec) => isRecurringDueOnDate(rec, date));
  const newTasks: Task[] = [];
  const generatedIds: string[] = [...(log[key] ?? [])];

  due.forEach((rec) => {
    if (alreadyGenerated.has(rec.id)) return;
    if (existingByRecOnDate.has(rec.id)) {
      // Já tem instância desse rec nesse dia — só registra no log pra não tentar de novo
      generatedIds.push(rec.id);
      return;
    }
    newTasks.push(buildTaskInstance(rec, date, categories));
    generatedIds.push(rec.id);
  });

  if (newTasks.length === 0 && generatedIds.length === (log[key]?.length ?? 0)) {
    // Nada mudou
    return { newTasks: [], updatedLog: log };
  }

  return {
    newTasks,
    updatedLog: { ...log, [key]: Array.from(new Set(generatedIds)) }
  };
};

// ---------- Catch-up: ao abrir o app, gera pendências dos últimos N dias ----------
// Útil para "semanal segunda-feira" quando você só abre o app na quarta.
// Limite: 7 dias atrás (não vale a pena olhar mais).
export const catchUpRecurringInstances = (params: {
  today: Date;
  recurringTasks: RecurringTask[];
  existingTasks: Task[];
  log: RecurringGenerationLog;
  categories: CategoryDef[];
  lookbackDays?: number;
}): { newTasks: Task[]; updatedLog: RecurringGenerationLog } => {
  const { today, recurringTasks, existingTasks, categories } = params;
  const lookbackDays = params.lookbackDays ?? 7;

  let log = params.log;
  let accumulatedNewTasks: Task[] = [];

  for (let offset = lookbackDays; offset >= 0; offset--) {
    const targetDate = startOfDay(subDays(today, offset));
    const result = generateInstancesForDate({
      date: targetDate,
      recurringTasks,
      existingTasks: [...existingTasks, ...accumulatedNewTasks],
      log,
      categories
    });
    accumulatedNewTasks = [...accumulatedNewTasks, ...result.newTasks];
    log = result.updatedLog;
  }

  return { newTasks: accumulatedNewTasks, updatedLog: log };
};

// ---------- Migração: converte Tasks antigas com isDaily=true em RecurringTask ----------
export const migrateLegacyIsDaily = (params: {
  tasks: Task[];
  recurringTasks: RecurringTask[];
}): { migratedRecurring: RecurringTask[]; cleanedTasks: Task[]; migratedCount: number } => {
  const { tasks, recurringTasks } = params;

  // Agrupa tasks legadas (isDaily=true, sem recurringTaskId) por título + categoria
  const legacyGroups = new Map<string, Task[]>();
  tasks.forEach((t) => {
    if (t.isDaily && !t.recurringTaskId) {
      const cat = t.category ?? 'Outros';
      const key = `${t.title.trim().toLowerCase()}|${cat}`;
      const arr = legacyGroups.get(key) ?? [];
      arr.push(t);
      legacyGroups.set(key, arr);
    }
  });

  if (legacyGroups.size === 0) {
    return { migratedRecurring: recurringTasks, cleanedTasks: tasks, migratedCount: 0 };
  }

  const newRecurring: RecurringTask[] = [...recurringTasks];
  const existingRecTitles = new Set(
    recurringTasks.map((r) => `${r.title.trim().toLowerCase()}|${(r.category ?? '').toLowerCase()}`)
  );

  let migratedCount = 0;

  legacyGroups.forEach((groupTasks, key) => {
    const example = groupTasks[0];
    const matchKey = `${example.title.trim().toLowerCase()}|${(example.category ?? '').toLowerCase()}`;
    if (existingRecTitles.has(matchKey)) return;

    newRecurring.push({
      id: crypto.randomUUID(),
      title: example.title,
      category: example.category ?? 'Outros',
      frequency: 'daily',
      active: true,
      createdAt: new Date().toISOString(),
      notes: 'Migrado automaticamente da flag legada "Todos os dias"'
    });
    migratedCount += groupTasks.length;
  });

  // Remove o isDaily das tasks migradas (as instâncias antigas viram pontuais
  // com o histórico intacto — só perdem o "aparece todo dia")
  const cleanedTasks = tasks.map((t) => {
    if (t.isDaily && !t.recurringTaskId) {
      const { isDaily, ...rest } = t;
      return rest as Task;
    }
    return t;
  });

  return { migratedRecurring: newRecurring, cleanedTasks, migratedCount };
};

// ---------- Helpers de UI ----------
export const frequencyLabel = (rec: RecurringTask): string => {
  switch (rec.frequency) {
    case 'daily':
      return 'Todo dia';
    case 'weekly': {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const shortDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      if (Array.isArray(rec.daysOfWeek) && rec.daysOfWeek.length > 0) {
        if (rec.daysOfWeek.length === 1) return `Toda ${days[rec.daysOfWeek[0]]}`;
        return rec.daysOfWeek
          .slice()
          .sort((a, b) => a - b)
          .map((d) => shortDays[d])
          .join(' • ');
      }
      return typeof rec.dayOfWeek === 'number' ? `Toda ${days[rec.dayOfWeek]}` : 'Semanal';
    }
    case 'biweekly': {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return typeof rec.dayOfWeek === 'number'
        ? `Quinzenal — ${days[rec.dayOfWeek]} sim, ${days[rec.dayOfWeek]} não`
        : 'Quinzenal';
    }
    case 'monthly':
      return typeof rec.dayOfMonth === 'number'
        ? `Todo dia ${rec.dayOfMonth} do mês`
        : 'Mensal';
    default:
      return '';
  }
};

export const frequencyShort = (f: Frequency): string =>
  f === 'daily'
    ? 'DIÁRIA'
    : f === 'weekly'
      ? 'SEMANAL'
      : f === 'biweekly'
        ? 'QUINZENAL'
        : 'MENSAL';
