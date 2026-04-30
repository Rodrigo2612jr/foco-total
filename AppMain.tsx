import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter as Router, Link, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  ClipboardList,
  Compass,
  Edit3,
  Filter,
  Heart,
  LogOut,
  Plus,
  Repeat,
  Send,
  Star,
  StickyNote,
  Target,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { format, isBefore, isSameDay, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Category,
  CategoryDef,
  CheckinConfig,
  FrenteIdea,
  FrenteProject,
  Goal,
  Priority,
  RecurringGenerationLog,
  RecurringTask,
  Task,
  ThemeType,
  User
} from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { WeeklyChart } from './components/WeeklyChart';
import { CategoryChart } from './components/CategoryChart';
import { RecurringTasksPanel } from './components/RecurringTasksPanel';
import { TodaysRoutineBlock } from './components/TodaysRoutineBlock';
import { FocoDoDiaCard, FrenteHealthBar } from './components/FrenteHealthBar';
import { FrentesPage } from './components/FrentesPage';
import { SemanaPage } from './components/SemanaPage';
import { ModoSabadoCard } from './components/ModoSabadoCard';
import { ProjectsTodayBlock } from './components/ProjectsTodayBlock';
import { UndoToast, UndoToastData } from './components/UndoToast';
import { GoalEditModal, NoteEditModal, TaskEditModal } from './components/EditModals';
import { CheckinModal } from './components/CheckinModal';
import { db } from './services/firebase';
import { catchUpRecurringInstances, migrateLegacyIsDaily, toDateKey } from './services/recurringService';
import { notifyDailyRoutineSummary } from './services/notifications';

const getEmptyData = () => ({
  goals: [] as Goal[],
  tasks: [] as Task[],
  notes: [] as string[],
  categories: [] as CategoryDef[],
  recurringTasks: [] as RecurringTask[],
  recurringGenerationLog: {} as RecurringGenerationLog,
  checkinConfig: {} as CheckinConfig,
  frenteIdeas: [] as FrenteIdea[],
  frenteProjects: [] as FrenteProject[]
});

const loadUserData = async (username: string) => {
  const ref = doc(db, 'users', username);
  const snap = await getDoc(ref);
  if (!snap.exists()) return getEmptyData();
  const data = snap.data() as Partial<{
    goals: Goal[];
    tasks: Task[];
    notes: string[];
    categories: CategoryDef[];
    recurringTasks: RecurringTask[];
    recurringGenerationLog: RecurringGenerationLog;
    checkinConfig: CheckinConfig;
    frenteIdeas: FrenteIdea[];
    frenteProjects: FrenteProject[];
  }>;
  return {
    goals: Array.isArray(data.goals) ? data.goals : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    recurringTasks: Array.isArray(data.recurringTasks) ? data.recurringTasks : [],
    recurringGenerationLog:
      data.recurringGenerationLog && typeof data.recurringGenerationLog === 'object'
        ? data.recurringGenerationLog
        : {},
    checkinConfig:
      data.checkinConfig && typeof data.checkinConfig === 'object' ? data.checkinConfig : {},
    frenteIdeas: Array.isArray(data.frenteIdeas) ? data.frenteIdeas : [],
    frenteProjects: Array.isArray(data.frenteProjects) ? data.frenteProjects : []
  };
};

const saveUserData = async (
  username: string,
  payload: {
    goals: Goal[];
    tasks: Task[];
    notes: string[];
    categories: CategoryDef[];
    recurringTasks: RecurringTask[];
    recurringGenerationLog: RecurringGenerationLog;
    checkinConfig: CheckinConfig;
    frenteIdeas: FrenteIdea[];
    frenteProjects: FrenteProject[];
  }
) => {
  const ref = doc(db, 'users', username);
  await setDoc(ref, payload, { merge: true });
};

const ChecklistItem: React.FC<{
  title: string;
  category?: string;
  completed: boolean;
  date: string;
  theme: ThemeType;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  isOverdue?: boolean;
  isRecurring?: boolean;
}> = ({ title, category, completed, date, theme, onToggle, onDelete, onEdit, isOverdue, isRecurring }) => {
  const isFem = theme === 'feminine';
  return (
    <div
      className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] transition-all duration-500 border touch-bounce ${
        completed
          ? isFem
            ? 'bg-rose-100/20 opacity-40 scale-[0.98]'
            : 'bg-zinc-900/40 opacity-50'
          : isFem
            ? 'bg-white shadow-xl shadow-rose-200/20 border border-rose-200/50'
            : 'bg-zinc-900 border border-zinc-800'
      } ${!completed && isOverdue ? (isFem ? 'border-red-400/80' : 'border-red-500/80') : ''}`}
    >
      <button
        onClick={onToggle}
        className={`shrink-0 transition-transform active:scale-75 p-1 mt-0.5 ${
          completed
            ? isFem
              ? 'text-rose-600'
              : 'text-blue-500'
            : isFem
              ? 'text-rose-300'
              : 'text-zinc-700'
        }`}
      >
        {completed ? <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" /> : <Circle className="w-6 h-6 sm:w-7 sm:h-7" />}
      </button>
      <div className="flex-1 min-w-0 text-left">
        <p
          className={`text-sm sm:text-base font-bold leading-snug break-words ${
            completed ? 'line-through text-rose-300' : isFem ? 'text-zinc-900' : 'text-zinc-100'
          }`}
        >
          {title}
        </p>
        <div className="flex items-center flex-wrap gap-2 mt-2">
          {isRecurring && (
            <span
              className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 ${
                isFem ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
              }`}
              title="Tarefa recorrente (gerada automaticamente)"
            >
              <Repeat className="w-3 h-3" />
              ROTINA
            </span>
          )}
          {category && (
            <span
              className={`text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                isFem ? 'bg-rose-100 text-rose-700' : 'bg-blue-900/30 text-blue-400'
              }`}
            >
              {category}
            </span>
          )}
          <span
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${
              isFem ? 'text-rose-400' : 'text-zinc-500'
            }`}
          >
            {format(parseISO(date), 'dd MMM', { locale: ptBR })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {onEdit && (
          <button
            onClick={onEdit}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              isFem ? 'text-rose-200 hover:text-rose-700 active:bg-rose-50' : 'text-zinc-800 hover:text-blue-400 active:bg-zinc-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className={`p-2 rounded-xl transition-all active:scale-90 ${
            isFem ? 'text-rose-200 hover:text-rose-700 active:bg-rose-50' : 'text-zinc-800 hover:text-rose-500 active:bg-zinc-800'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const AppContent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const isFem = user.theme === 'feminine';
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringGenerationLog, setRecurringGenerationLog] = useState<RecurringGenerationLog>({});
  const [checkinConfig, setCheckinConfig] = useState<CheckinConfig>({});
  const [frenteIdeas, setFrenteIdeas] = useState<FrenteIdea[]>([]);
  const [frenteProjects, setFrenteProjects] = useState<FrenteProject[]>([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canSave, setCanSave] = useState(false);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [goalDraft, setGoalDraft] = useState<{
    title: string;
    date: string;
    category: Category;
    priority: Priority;
    isDaily: boolean;
    description: string;
  } | null>(null);
  const [taskDraft, setTaskDraft] = useState<{
    title: string;
    date: string;
    category: Category;
    isDaily: boolean;
  } | null>(null);

  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterCategory, setFilterCategory] = useState<string>('TUDO');
  const [activeFilterTab, setActiveFilterTab] = useState<'HOJE' | 'ONTEM' | 'OUTRO'>('HOJE');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'PENDENTES' | 'CONCLUIDOS'>('TODOS');

  // Reminder automático do Check-in (roda a cada minuto enquanto app tá aberto)
  useEffect(() => {
    if (isLoading) return;

    // Pede permissão de notificação na primeira vez (silencioso — se negar, só não notifica)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }


    const check = () => {
      const now = new Date();
      const reminderH = checkinConfig.reminderHour ?? 18;
      const reminderM = checkinConfig.reminderMinute ?? 0;
      const todayKey = format(now, 'yyyy-MM-dd');

      if (checkinConfig.lastSentDate === todayKey) return; // já enviou hoje
      if (now.getHours() !== reminderH) return;
      if (now.getMinutes() !== reminderM) return;

      // Notificação local (se permissão concedida)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('⏰ Hora do check-in!', {
            body: checkinConfig.recipientName
              ? `Sua mensagem pra ${checkinConfig.recipientName} tá pronta. Toque pra enviar.`
              : 'Sua mensagem tá pronta. Toque pra enviar.',
            tag: `checkin-${todayKey}`
          });
        } catch {
          // silencioso
        }
      }
      // Abre o modal automaticamente
      setShowCheckin(true);
    };

    check();
    const id = window.setInterval(check, 60000);
    return () => window.clearInterval(id);
  }, [checkinConfig, isLoading]);

  // Toggle de completed pra tasks — sempre registra completedAt
  const toggleTaskCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = !t.completed;
        if (next) {
          return { ...t, completed: true, completedAt: new Date().toISOString() };
        }
        // Desmarcando — remove completedAt
        const { completedAt, ...rest } = t;
        return { ...rest, completed: false };
      })
    );
  };

  // Undo toast
  const [undoToast, setUndoToast] = useState<UndoToastData | null>(null);
  const showUndo = (data: { message: string; onUndo: () => void }) => {
    setUndoToast({ id: crypto.randomUUID(), ...data });
  };

  // Delete recurring com opção de cascade nas instâncias pendentes
  const handleDeleteRecurringCascade = (recId: string, alsoDeletePending: boolean) => {
    setRecurringTasks((prev) => prev.filter((r) => r.id !== recId));
    if (alsoDeletePending) {
      setTasks((prev) => prev.filter((t) => !(t.recurringTaskId === recId && !t.completed)));
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    hasLoadedRef.current = false;

    loadUserData(user.username)
      .then((loaded) => {
        if (!isMounted) return;

        // 1. Migra tasks legadas (isDaily=true) para RecurringTasks diárias (uma única vez)
        const { migratedRecurring, cleanedTasks } = migrateLegacyIsDaily({
          tasks: loaded.tasks,
          recurringTasks: loaded.recurringTasks
        });

        // 2. Catch-up: gera instâncias dos últimos 7 dias que ainda não foram geradas
        const { newTasks, updatedLog } = catchUpRecurringInstances({
          today: new Date(),
          recurringTasks: migratedRecurring,
          existingTasks: cleanedTasks,
          log: loaded.recurringGenerationLog,
          categories: loaded.categories
        });

        setGoals(loaded.goals);
        setTasks([...newTasks, ...cleanedTasks]);
        setNotes(loaded.notes);
        setCategories(loaded.categories);
        setRecurringTasks(migratedRecurring);
        setRecurringGenerationLog(updatedLog);
        setCheckinConfig(loaded.checkinConfig ?? {});
        setFrenteIdeas(loaded.frenteIdeas ?? []);
        setFrenteProjects(loaded.frenteProjects ?? []);
        setCanSave(true);
        hasLoadedRef.current = true;
        setIsLoading(false);

        // Notificação local: resumo das recorrentes do dia (uma vez por dia)
        const todayKey = toDateKey(new Date());
        const allTasks = [...newTasks, ...cleanedTasks];
        const todayRecurringTasks = allTasks.filter(
          (t) =>
            t.recurringTaskId &&
            t.scheduledDate.slice(0, 10) === todayKey
        );
        notifyDailyRoutineSummary({
          username: user.username,
          dateKey: todayKey,
          pendingCount: todayRecurringTasks.filter((t) => !t.completed).length,
          completedCount: todayRecurringTasks.filter((t) => t.completed).length
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setGoals([]);
        setTasks([]);
        setNotes([]);
        setCategories([]);
        setRecurringTasks([]);
        setRecurringGenerationLog({});
        setCheckinConfig({});
        setFrenteIdeas([]);
        setFrenteProjects([]);
        setCanSave(false);
        hasLoadedRef.current = true;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user.username]);

  useEffect(() => {
    if (!hasLoadedRef.current || isLoading || !canSave) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveUserData(user.username, {
        goals,
        tasks,
        notes,
        categories,
        recurringTasks,
        recurringGenerationLog,
        checkinConfig,
        frenteIdeas,
        frenteProjects
      }).catch((err) => console.error('[foco-total] auto-save falhou:', err));
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [goals, tasks, notes, categories, recurringTasks, recurringGenerationLog, checkinConfig, frenteIdeas, frenteProjects, user.username, isLoading, canSave]);

  // Atualiza um projeto e salva IMEDIATO no Firestore (sem esperar o debounce de 400ms).
  // Usado nas ações críticas como marcar step done, concluir projeto pelo card etc —
  // garante que mesmo se o user fechar o app rápido, a alteração não se perde.
  const upsertFrenteProject = (project: FrenteProject) => {
    setFrenteProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === project.id);
      const next = idx >= 0 ? prev.map((p, i) => (i === idx ? project : p)) : [project, ...prev];
      // Save imediato — não espera o useEffect debouncer
      if (hasLoadedRef.current && !isLoading && canSave) {
        saveUserData(user.username, {
          goals,
          tasks,
          notes,
          categories,
          recurringTasks,
          recurringGenerationLog,
          checkinConfig,
          frenteIdeas,
          frenteProjects: next
        }).catch((err) => console.error('[foco-total] upsertFrenteProject falhou:', err));
      }
      return next;
    });
  };

  const applyFilters = (items: any[], dateKey: string, includeOverdue = false) => {
    const selectedDate = parseISO(filterDate);
    return items.filter((item) => {
      const itemDate = parseISO(item[dateKey]);
      const itemCategory = (item.category ?? 'Outros') as Category;
      const matchesDate = isSameDay(itemDate, selectedDate);
      const matchesDaily = item.isDaily ? (!item.completed || matchesDate) : false;
      const matchesOverdue = includeOverdue && !item.completed && isBefore(itemDate, selectedDate);
      const matchesCategory = filterCategory === 'TUDO' || itemCategory === filterCategory;
      const matchesStatus =
        filterStatus === 'TODOS'
          ? true
          : filterStatus === 'CONCLUIDOS'
            ? item.completed
            : !item.completed;
      return (matchesDate || matchesDaily || matchesOverdue) && matchesCategory && matchesStatus;
    });
  };

  const currentGoals = useMemo(
    () => applyFilters(goals, 'date'),
    [goals, filterDate, filterCategory, filterStatus]
  );
  // Checklist principal mostra APENAS tarefas avulsas (sem recurringTaskId).
  // As recorrentes aparecem no bloco <TodaysRoutineBlock /> acima, respeitando o mesmo filtro de data.
  // Assim a promoção que cai na sexta só aparece na sexta em "Rotina de Hoje" — não polui o dia-a-dia.
  const currentTasks = useMemo(
    () => applyFilters(tasks, 'scheduledDate', true).filter((t) => !t.recurringTaskId),
    [tasks, filterDate, filterCategory, filterStatus]
  );

  const handleQuickDateFilter = (type: 'HOJE' | 'ONTEM') => {
    setActiveFilterTab(type);
    const date = type === 'HOJE' ? new Date() : subDays(new Date(), 1);
    setFilterDate(format(date, 'yyyy-MM-dd'));
  };

  const statsGoals = {
    total: goals.length,
    completed: goals.filter((g) => g.completed).length,
    pending: goals.length - goals.filter((g) => g.completed).length,
    rate: goals.length ? ((goals.filter((g) => g.completed).length / goals.length) * 100).toFixed(0) : '0'
  };

  const statsTasks = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    pending: tasks.length - tasks.filter((t) => t.completed).length,
    rate: tasks.length ? ((tasks.filter((t) => t.completed).length / tasks.length) * 100).toFixed(0) : '0'
  };

  useEffect(() => {
    if (!editingGoal) {
      setGoalDraft(null);
      return;
    }
    setGoalDraft({
      title: editingGoal.title,
      date: format(parseISO(editingGoal.date), 'yyyy-MM-dd'),
      category: editingGoal.category,
      priority: editingGoal.priority,
      isDaily: !!editingGoal.isDaily,
      description: editingGoal.description ?? ''
    });
  }, [editingGoal]);

  useEffect(() => {
    if (!editingTask) {
      setTaskDraft(null);
      return;
    }
    setTaskDraft({
      title: editingTask.title,
      date: format(parseISO(editingTask.scheduledDate), 'yyyy-MM-dd'),
      category: editingTask.category ?? 'Outros',
      isDaily: !!editingTask.isDaily
    });
  }, [editingTask]);

  const isRotinaPath = location.pathname === '/rotina';
  const isFrentesPath = location.pathname === '/frentes';
  const isSemanaPath = location.pathname === '/semana';
  const isGoalsPath = !isRotinaPath && !isFrentesPath && !isSemanaPath && (location.pathname === '/' || location.pathname === '/metas');
  const isTasksPath = location.pathname === '/tarefas';
  const isChecklistGoalsPath = location.pathname === '/checklist-metas';
  const isChecklistTasksPath = location.pathname === '/checklist-tarefas';
  const isChecklistView = isChecklistGoalsPath || isChecklistTasksPath;

  const weeklyStats = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, index) => subDays(new Date(), 6 - index));
    return days.map((day) => {
      const label = format(day, 'EEE', { locale: ptBR }).toUpperCase();
      let total = 0;
      let completed = 0;

      goals.forEach((goal) => {
        const goalDate = parseISO(goal.date);
        const isForDay = isSameDay(goalDate, day) || goal.isDaily;
        if (!isForDay) return;
        total += 1;
        if (goal.completed) completed += 1;
      });

      tasks.forEach((task) => {
        const taskDate = parseISO(task.scheduledDate);
        const isForDay = isSameDay(taskDate, day) || task.isDaily;
        if (!isForDay) return;
        total += 1;
        if (task.completed) completed += 1;
      });

      return { day: label, completed, total };
    });
  }, [goals, tasks]);

  const categoryItems = useMemo(() => [...goals, ...tasks], [goals, tasks]);

  // Opções unificadas de categoria: dinâmicas (prioridade) + legadas (fallback sem duplicar).
  // Usadas nos selects dos formulários e no filtro global.
  const LEGACY_CATEGORIES = ['Trabalho', 'Pessoal', 'Saúde', 'Estudos', 'Outros'];
  const allCategoryOptions = useMemo(() => {
    const dynamicNames = categories.map((c) => c.name);
    const merged = [...dynamicNames];
    LEGACY_CATEGORIES.forEach((legacy) => {
      if (!merged.some((n) => n.toLowerCase() === legacy.toLowerCase())) {
        merged.push(legacy);
      }
    });
    return merged;
  }, [categories]);

  const navItems = [
    { path: '/tarefas', label: 'Hoje', icon: ClipboardList, active: isTasksPath },
    { path: '/semana', label: 'Semana', icon: CalendarIcon, active: isSemanaPath },
    { path: '/frentes', label: 'Frentes', icon: Compass, active: isFrentesPath },
    { path: '/rotina', label: 'Rotina', icon: Repeat, active: isRotinaPath },
    { path: '/metas', label: 'Metas', icon: Target, active: isGoalsPath },
  ];

  const Sidebar = () => (
    <aside className={`w-72 flex flex-col h-full ${isFem ? 'bg-white border-r border-rose-100' : 'bg-black border-r border-zinc-900'}`}>
      <div className="p-12 text-center">
        <h1 className={`text-2xl font-black italic tracking-tighter uppercase ${isFem ? 'text-rose-800' : 'text-white'}`}>
          {isFem ? <Heart className="inline w-6 h-6 mr-2 fill-current" /> : <Zap className="inline w-6 h-6 mr-2 text-blue-500" />}
          {isFem ? 'YASMIN' : user.name} <span className={isFem ? 'text-rose-500' : 'text-blue-500'}>FOCO</span>
        </h1>
      </div>
      <nav className="flex-1 px-6 space-y-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              item.active ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')
            }`}
          >
            <item.icon className="w-4 h-4" /> {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-10 border-t border-rose-100">
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 text-[10px] font-black uppercase transition-all ${
            isFem ? 'text-rose-400 hover:text-rose-700' : 'text-zinc-700 hover:text-white'
          }`}
        >
          <LogOut className="w-4 h-4" /> Finalizar Protocolo
        </button>
      </div>
    </aside>
  );

  const BottomNav = () => (
    <nav className={`mobile-bottom-nav lg:hidden ${isFem ? 'mobile-bottom-nav-fem' : 'mobile-bottom-nav-masc'}`}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all touch-bounce min-w-[60px] ${
              item.active
                ? isFem
                  ? 'text-rose-600 bg-rose-50'
                  : 'text-blue-500 bg-blue-500/10'
                : isFem
                  ? 'text-rose-300'
                  : 'text-zinc-600'
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.active ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[8px] font-black uppercase tracking-wider leading-none">{item.label.split(' ')[0]}</span>
          </Link>
        ))}
        <button
          onClick={onLogout}
          className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all touch-bounce min-w-[60px] ${
            isFem ? 'text-rose-300' : 'text-zinc-600'
          }`}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-wider leading-none">Sair</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className={`flex min-h-screen min-h-[100dvh] ${isFem ? 'bg-[#FFF8F8]' : 'bg-black text-white'}`}>
      {/* Mobile Top Bar */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 mobile-top-bar px-4 py-3 border-b flex justify-between items-center backdrop-blur-xl ${isFem ? 'bg-white/90 border-rose-100 text-rose-700' : 'bg-black/90 border-zinc-900 text-white'}`}>
        <div className="flex items-center gap-2">
          {isFem ? <Heart className="w-4 h-4 fill-current text-rose-500" /> : <Zap className="w-4 h-4 text-blue-500" />}
          <span className="font-black italic uppercase text-[10px] tracking-wider">
            {isFem ? 'YASMIN' : user.name}
          </span>
        </div>
        <span className="font-black italic uppercase text-[9px] tracking-widest opacity-60">
          {isSemanaPath
            ? 'SEMANA'
            : isFrentesPath
              ? 'FRENTES'
              : isRotinaPath
                ? 'ROTINA'
                : isChecklistGoalsPath
              ? 'CHECK METAS'
              : isChecklistTasksPath
                ? 'CHECK TAREFAS'
                : isTasksPath
                  ? 'TAREFAS'
                  : 'METAS'}
        </span>
        <div className="w-8" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto w-full mt-14 lg:mt-0 overflow-x-hidden main-content-area">
        <div className="space-y-8 sm:space-y-16 animate-fade-in">
          {isLoading && (
            <div className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}>
              Sincronizando dados...
            </div>
          )}

          <div className="flex flex-col gap-4 sm:gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 sm:gap-8">
              <div>
                <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none ${isFem ? 'text-rose-800' : 'text-white'}`}>
                  {isSemanaPath
                    ? 'Visão da Semana'
                    : isFrentesPath
                      ? 'Frentes'
                      : isRotinaPath
                        ? 'Rotina Recorrente'
                        : isChecklistGoalsPath
                          ? 'Checklist de Metas'
                          : isChecklistTasksPath
                            ? 'Checklist de Tarefas'
                            : isTasksPath
                              ? 'Dashboard de Tarefas'
                              : 'Dashboard de Metas'}
                </h2>
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] mt-2 sm:mt-4 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>
                  {isSemanaPath
                    ? 'Plano dos próximos 7 dias'
                    : isFrentesPath
                      ? '7 frentes • saúde, tarefas e ideias'
                      : isRotinaPath
                        ? 'Tarefas fixas • Geradas automaticamente'
                        : isChecklistView
                          ? 'Execução • Registros do Dia'
                          : isTasksPath
                            ? 'Produtividade • Execução Tática'
                            : 'Foco • Metas Estratégicas'}
                </p>
              </div>
            </div>

            {/* Filter Bar - Mobile Optimized */}
            <div className={`flex flex-wrap items-center gap-2 p-2 rounded-2xl sm:rounded-[2.5rem] w-full ${isFem ? 'bg-white shadow-xl shadow-rose-200/20 border border-rose-100' : 'bg-zinc-900 border border-zinc-800'}`}>
              <div className="flex gap-1 p-1">
                {(['HOJE', 'ONTEM'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleQuickDateFilter(tab)}
                    className={`px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-[9px] font-black uppercase transition-all touch-bounce ${
                      activeFilterTab === tab
                        ? isFem
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-300/30'
                          : 'bg-blue-600 text-white'
                        : isFem
                          ? 'text-rose-300 hover:text-rose-600'
                          : 'text-zinc-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl flex-1 min-w-[130px] ${isFem ? 'border border-rose-50' : 'border border-zinc-800'}`}>
                <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`} />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setActiveFilterTab('OUTRO');
                  }}
                  className={`bg-transparent text-[10px] font-black uppercase outline-none w-full ${
                    isFem ? 'text-rose-600' : 'text-zinc-400'
                  }`}
                />
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl flex-1 min-w-[100px] ${isFem ? 'border border-rose-50' : 'border border-zinc-800'}`}>
                <Filter className={`w-3.5 h-3.5 shrink-0 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`} />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer w-full ${
                    isFem ? 'text-rose-600' : 'text-zinc-400'
                  }`}
                >
                  <option value="TUDO">Categorias</option>
                  {allCategoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl flex-1 min-w-[100px] ${isFem ? 'border border-rose-50' : 'border border-zinc-800'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`} />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'TODOS' | 'PENDENTES' | 'CONCLUIDOS')}
                  className={`bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer w-full ${
                    isFem ? 'text-rose-600' : 'text-zinc-400'
                  }`}
                >
                  <option value="TODOS">Status</option>
                  <option value="PENDENTES">Pendentes</option>
                  <option value="CONCLUIDOS">Concluídos</option>
                </select>
              </div>
            </div>
          </div>

          {!isChecklistView && !isRotinaPath && !isFrentesPath && !isSemanaPath && (
            <DashboardHeader {...(isTasksPath ? statsTasks : statsGoals)} theme={user.theme} />
          )}

          {isSemanaPath ? (
            <SemanaPage
              theme={user.theme}
              categories={categories}
              recurringTasks={recurringTasks}
              tasks={tasks}
              projects={frenteProjects}
              onToggleTask={toggleTaskCompleted}
              onUpsertProject={upsertFrenteProject}
            />
          ) : isFrentesPath ? (
            <FrentesPage
              theme={user.theme}
              categories={categories}
              recurringTasks={recurringTasks}
              tasks={tasks}
              ideas={frenteIdeas}
              projects={frenteProjects}
              onAddIdea={(categoryName, text) => {
                setFrenteIdeas((prev) => [
                  {
                    id: crypto.randomUUID(),
                    categoryName,
                    text,
                    createdAt: new Date().toISOString()
                  },
                  ...prev
                ]);
              }}
              onToggleIdea={(id) => {
                setFrenteIdeas((prev) =>
                  prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
                );
              }}
              onDeleteIdea={(id) => {
                setFrenteIdeas((prev) => prev.filter((i) => i.id !== id));
              }}
              onToggleTask={toggleTaskCompleted}
              onUpsertProject={upsertFrenteProject}
              onDeleteProject={(id) => {
                setFrenteProjects((prev) => prev.filter((p) => p.id !== id));
              }}
            />
          ) : isRotinaPath ? (
            <RecurringTasksPanel
              theme={user.theme}
              categories={categories}
              recurringTasks={recurringTasks}
              tasks={tasks}
              onUpdateCategories={setCategories}
              onUpdateRecurrings={setRecurringTasks}
              onDeleteRecurringCascade={handleDeleteRecurringCascade}
              onShowUndoToast={showUndo}
            />
          ) : isChecklistGoalsPath ? (
            <section className={`w-full flex flex-col space-y-4 sm:space-y-8 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[3rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-lg sm:text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                  <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Separadas por filtro</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGoals(goals.filter((g) => !g.isDaily))}
                    className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                  >
                    Remover diários
                  </button>
                  <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                    <Target className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {currentGoals.map((g) => (
                  <ChecklistItem
                    key={g.id}
                    title={g.title}
                    category={g.category}
                    completed={g.completed}
                    date={g.date}
                    theme={user.theme}
                    onToggle={() => setGoals(goals.map((x) => (x.id === g.id ? { ...x, completed: !x.completed } : x)))}
                    onDelete={() => setGoals(goals.filter((x) => x.id !== g.id))}
                    onEdit={() => setEditingGoal(g)}
                  />
                ))}
                {currentGoals.length === 0 && (
                  <div className="text-center py-20 opacity-20">
                    <Star className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sem metas no filtro</p>
                  </div>
                )}
              </div>
            </section>
          ) : isChecklistTasksPath ? (
            <>
            <TodaysRoutineBlock
              theme={user.theme}
              filterDate={filterDate}
              tasks={tasks}
              categories={categories}
              onToggle={toggleTaskCompleted}
            />
            <section className={`w-full flex flex-col space-y-4 sm:space-y-8 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[3rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-lg sm:text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Tarefas do Dia</h3>
                  <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Checklist diário</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTasks(tasks.filter((t) => !t.isDaily))}
                    className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                  >
                    Remover diários
                  </button>
                  <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                    <ClipboardList className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {currentTasks.map((t) => (
                  <ChecklistItem
                    key={t.id}
                    title={t.title}
                    category={t.category}
                    completed={t.completed}
                    date={t.scheduledDate}
                    theme={user.theme}
                    isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                    isRecurring={!!t.recurringTaskId}
                    onToggle={() => toggleTaskCompleted(t.id)}
                    onDelete={() => setTasks(tasks.filter((x) => x.id !== t.id))}
                    onEdit={() => setEditingTask(t)}
                  />
                ))}
                {currentTasks.length === 0 && (
                  <div className="text-center py-20 opacity-20">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sem tarefas no filtro</p>
                  </div>
                )}
              </div>
            </section>
            </>
          ) : (
            <>
              {isTasksPath && (
                <>
                  {/* Modo Sábado: ativa sozinho sex >= 17h e sáb o dia todo */}
                  <ModoSabadoCard theme={user.theme} username={user.username} />
                  <FrenteHealthBar
                    theme={user.theme}
                    categories={categories}
                    tasks={tasks}
                    onPickFrente={(name) => setFilterCategory(name)}
                  />
                  <FocoDoDiaCard
                    theme={user.theme}
                    categories={categories}
                    tasks={tasks}
                    onPickFrente={(name) => setFilterCategory(name)}
                  />
                  <ProjectsTodayBlock
                    theme={user.theme}
                    projects={frenteProjects}
                    categories={categories}
                    onUpsertProject={upsertFrenteProject}
                  />
                  <TodaysRoutineBlock
                    theme={user.theme}
                    filterDate={filterDate}
                    tasks={tasks}
                    categories={categories}
                    onToggle={toggleTaskCompleted}
                  />
                </>
              )}
              {/* Uma única seção ativa por vez (/metas OU /tarefas) — layout em largura total */}
              <div className="w-full grid grid-cols-1 gap-4 sm:gap-8 lg:gap-12">
                {isGoalsPath && (
                  <section className={`w-full flex flex-col space-y-4 sm:space-y-8 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[3rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Objetivos Estratégicos</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setGoals(goals.filter((g) => !g.isDaily))}
                          className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                        >
                          Remover diários
                        </button>
                        <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                          <Target className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const title = f.get('title') as string;
                        const cat = f.get('category') as Category;
                        const date = (f.get('date') as string) || filterDate;
                        const isDaily = f.get('daily') === 'on';
                        const description = (f.get('description') as string) || '';
                        if (!title) return;
                        setGoals([
                          {
                            id: crypto.randomUUID(),
                            title,
                            completed: false,
                            date: date + 'T12:00:00',
                            category: cat,
                            priority: Priority.MEDIUM,
                            isDaily,
                            description
                          },
                          ...goals
                        ]);
                        e.currentTarget.reset();
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          name="title"
                          required
                          placeholder="Definir nova meta..."
                          className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`}
                        />
                        <input
                          name="description"
                          placeholder="Descrição rápida"
                          className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          <select
                            name="category"
                            className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                          >
                            {allCategoryOptions.map((c) => (
                              <option key={c} value={c}>
                                Categoria: {c}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            name="date"
                            defaultValue={filterDate}
                            className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none w-full ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                          />
                          <label className={`flex items-center justify-center gap-2 px-4 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}>
                            <input type="checkbox" name="daily" className="accent-rose-500" />
                            Todos os dias
                          </label>
                        </div>
                        <button
                          type="submit"
                          className={`w-full p-3 sm:p-4 rounded-[1.75rem] text-white shadow-lg active:scale-95 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300/60' : 'bg-blue-600'} flex items-center justify-center gap-2`}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Adicionar Meta</span>
                        </button>
                      </div>
                    </form>

                    <div className="space-y-4">
                      {currentGoals.map((g) => (
                        <ChecklistItem
                          key={g.id}
                          title={g.title}
                          category={g.category}
                          completed={g.completed}
                          date={g.date}
                          theme={user.theme}
                          onToggle={() => setGoals(goals.map((x) => (x.id === g.id ? { ...x, completed: !x.completed } : x)))}
                          onDelete={() => setGoals(goals.filter((x) => x.id !== g.id))}
                          onEdit={() => setEditingGoal(g)}
                        />
                      ))}
                      {currentGoals.length === 0 && (
                        <div className="text-center py-20 opacity-20">
                          <Star className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Nenhuma meta ativa</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {isTasksPath && (
                  <section className={`w-full flex flex-col space-y-4 sm:space-y-8 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[3rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Checklist</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Execução Diária</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTasks(tasks.filter((t) => !t.isDaily))}
                          className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                        >
                          Remover diários
                        </button>
                        <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                          <ClipboardList className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const title = f.get('title') as string;
                        const date = (f.get('date') as string) || filterDate;
                        const isDaily = f.get('daily') === 'on';
                        const category = (f.get('category') as Category) || 'Outros';
                        if (!title) return;
                        setTasks([
                          {
                            id: crypto.randomUUID(),
                            title,
                            completed: false,
                            scheduledDate: date + 'T12:00:00',
                            createdAt: new Date().toISOString(),
                            category,
                            isDaily
                          },
                          ...tasks
                        ]);
                        e.currentTarget.reset();
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          name="title"
                          required
                          placeholder="O que precisa ser executado?"
                          className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          <select
                            name="category"
                            defaultValue={allCategoryOptions.includes('Outros') ? 'Outros' : allCategoryOptions[0]}
                            className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                          >
                            {allCategoryOptions.map((c) => (
                              <option key={c} value={c}>
                                Categoria: {c}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            name="date"
                            defaultValue={filterDate}
                            className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none w-full ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                          />
                          <label className={`flex items-center justify-center gap-2 px-4 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}>
                            <input type="checkbox" name="daily" className="accent-rose-500" />
                            Todos os dias
                          </label>
                        </div>
                        <button
                          type="submit"
                          className={`w-full p-3 sm:p-4 rounded-[1.75rem] text-white shadow-lg active:scale-95 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300/60' : 'bg-blue-600'} flex items-center justify-center gap-2`}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Adicionar Tarefa</span>
                        </button>
                      </div>
                    </form>

                    <div className="space-y-4">
                      {currentTasks.map((t) => (
                        <ChecklistItem
                          key={t.id}
                          title={t.title}
                          category={t.category}
                          completed={t.completed}
                          date={t.scheduledDate}
                          theme={user.theme}
                          isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                          isRecurring={!!t.recurringTaskId}
                          onToggle={() => toggleTaskCompleted(t.id)}
                          onDelete={() => setTasks(tasks.filter((x) => x.id !== t.id))}
                          onEdit={() => setEditingTask(t)}
                        />
                      ))}
                      {currentTasks.length === 0 && (
                        <div className="text-center py-20 opacity-20">
                          <ClipboardList className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Limpo e focado</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {!isChecklistView && (
                <section className="space-y-10">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-600 shadow-lg shadow-rose-300' : 'bg-zinc-900'}`}>
                      <StickyNote className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Lembretes & Notas</h3>
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Memória Rápida</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {notes.map((note, idx) => (
                      <div key={idx} className={`p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] min-h-[120px] sm:min-h-[160px] relative group border transition-all hover:-translate-y-2 duration-500 ${isFem ? 'bg-white border-rose-100 text-rose-950 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                        <button
                          onClick={() => {
                            setEditingNoteIndex(idx);
                            setEditingNoteText(note);
                          }}
                          className={`absolute top-4 sm:top-6 left-4 sm:left-6 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all p-1 ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-blue-400'}`}
                        >
                          <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => setNotes(notes.filter((_, i) => i !== idx))}
                          className="absolute top-4 sm:top-6 right-4 sm:right-6 text-rose-200 hover:text-rose-700 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all p-1"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <p className="text-xs font-bold leading-relaxed uppercase tracking-wider">{note}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const text = prompt('O que você quer lembrar?');
                        if (text) setNotes([...notes, text]);
                      }}
                      className={`p-5 sm:p-8 rounded-2xl sm:rounded-[3.5rem] min-h-[120px] sm:min-h-[160px] border-2 border-dashed flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all group touch-bounce ${
                        isFem
                          ? 'border-rose-200 text-rose-400 hover:border-rose-700 hover:text-rose-800 hover:bg-rose-100/20'
                          : 'border-zinc-800 text-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <Plus className="w-6 h-6 sm:w-8 sm:h-8 group-hover:rotate-90 transition-transform" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Adicionar Nota</span>
                    </button>
                  </div>
                </section>
              )}

              {!isChecklistView && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12">
                  <WeeklyChart data={weeklyStats} title="PERFORMANCE SEMANAL" />
                  <CategoryChart items={categoryItems} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {editingGoal && goalDraft && (
        <GoalEditModal
          theme={user.theme}
          goal={editingGoal}
          draft={goalDraft}
          setDraft={setGoalDraft}
          categoryOptions={allCategoryOptions}
          onClose={() => setEditingGoal(null)}
          onSave={() => {
            setGoals(goals.map((g) => (g.id === editingGoal.id ? {
              ...g,
              title: goalDraft.title.trim() || g.title,
              date: (goalDraft.date || format(parseISO(g.date), 'yyyy-MM-dd')) + 'T12:00:00',
              category: goalDraft.category,
              priority: goalDraft.priority,
              isDaily: goalDraft.isDaily,
              description: goalDraft.description.trim()
            } : g)));
            setEditingGoal(null);
          }}
        />
      )}

      {editingTask && taskDraft && (
        <TaskEditModal
          theme={user.theme}
          task={editingTask}
          draft={taskDraft}
          setDraft={setTaskDraft}
          categoryOptions={allCategoryOptions}
          onClose={() => setEditingTask(null)}
          onSave={() => {
            setTasks(tasks.map((t) => (t.id === editingTask.id ? {
              ...t,
              title: taskDraft.title.trim() || t.title,
              scheduledDate: (taskDraft.date || format(parseISO(t.scheduledDate), 'yyyy-MM-dd')) + 'T12:00:00',
              category: taskDraft.category,
              isDaily: taskDraft.isDaily
            } : t)));
            setEditingTask(null);
          }}
        />
      )}

      {editingNoteIndex !== null && (
        <NoteEditModal
          theme={user.theme}
          value={editingNoteText}
          setValue={setEditingNoteText}
          onClose={() => setEditingNoteIndex(null)}
          onSave={() => {
            if (editingNoteIndex === null) return;
            setNotes(notes.map((n, i) => (i === editingNoteIndex ? editingNoteText.trim() || n : n)));
            setEditingNoteIndex(null);
          }}
        />
      )}

      <UndoToast theme={user.theme} toast={undoToast} onDismiss={() => setUndoToast(null)} />

      {/* Botão flutuante "Check-in" — sempre visível, destaca após o horário configurado */}
      {(() => {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const reminderMin = (checkinConfig.reminderHour ?? 18) * 60 + (checkinConfig.reminderMinute ?? 0);
        const isReminderTime = nowMin >= reminderMin;
        const hh = String(checkinConfig.reminderHour ?? 18).padStart(2, '0');
        const mm = String(checkinConfig.reminderMinute ?? 0).padStart(2, '0');
        return (
          <button
            onClick={() => {
              // Pede permissão de notificação na primeira vez (user gesture exigido pelo browser)
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => undefined);
              }
              setShowCheckin(true);
            }}
            title={`Gerar check-in do dia (lembrete ${hh}:${mm})`}
            className={`fixed z-[60] right-5 lg:right-8 rounded-full shadow-2xl flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-4 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${
              isReminderTime
                ? 'bg-green-600 hover:bg-green-500 shadow-green-500/50 animate-pulse'
                : isFem
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-400/40'
                  : 'bg-zinc-800 hover:bg-zinc-700 shadow-black/40'
            }`}
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 1rem))' }}
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Check-in</span>
          </button>
        );
      })()}

      {showCheckin && (
        <CheckinModal
          theme={user.theme}
          tasks={tasks}
          goals={goals}
          projects={frenteProjects}
          whatsappRecipient={checkinConfig.whatsappRecipient}
          recipientName={checkinConfig.recipientName}
          reminderHour={checkinConfig.reminderHour}
          reminderMinute={checkinConfig.reminderMinute}
          onClose={() => setShowCheckin(false)}
          onUpdateConfig={(cfg) =>
            setCheckinConfig((prev) => ({ ...prev, ...cfg }))
          }
          onAddQuickDone={(title) => {
            const now = new Date();
            const newTask: Task = {
              id: crypto.randomUUID(),
              title,
              completed: true,
              scheduledDate: now.toISOString(),
              createdAt: now.toISOString(),
              completedAt: now.toISOString(),
              category: 'Avulsa'
            };
            setTasks((prev) => [newTask, ...prev]);
          }}
          onMarkAsCompletedToday={(ids) => {
            const nowIso = new Date().toISOString();
            const idSet = new Set(ids);
            setTasks((prev) =>
              prev.map((t) => (idSet.has(t.id) ? { ...t, completedAt: nowIso } : t))
            );
          }}
        />
      )}
    </div>
  );
};

const Login: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [user, setUser] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = user.toLowerCase().trim();
    if (!u) {
      setError('Informe o acesso');
      return;
    }
    if (u === 'pascoto' || u === 'pascot') {
      onLogin({ username: 'pascoto', name: 'PASCOTO', theme: 'masculine' });
      return;
    }
    if (u === 'yasmin') {
      onLogin({ username: 'yasmin', name: 'YASMIN', theme: 'feminine' });
      return;
    }
    setError('Acesso inválido');
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-6 sm:p-8" style={{ minHeight: '100dvh' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-white to-white"></div>
      <div className="relative w-full max-w-md bg-white border border-zinc-100 p-6 sm:p-12 lg:p-16 rounded-[3rem] sm:rounded-[4.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] space-y-8 sm:space-y-16 text-center animate-scale-in">
        <div className="space-y-4 sm:space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-black rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl transform rotate-12 hover:rotate-0 transition-transform duration-500">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-black">SISTEMA <span className="text-zinc-300">DE FOCO</span></h1>
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-[0.5em] sm:tracking-[0.8em] mt-2 sm:mt-3">Auth Protocol v5.0</p>
          </div>
        </div>

        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div className="relative group">
            <input
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                if (error) setError('');
              }}
              placeholder="IDENTIFICAÇÃO DO USUÁRIO"
              className="w-full bg-zinc-50 border border-zinc-100 p-5 sm:p-6 rounded-2xl sm:rounded-3xl font-black uppercase text-zinc-800 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-300 text-center text-xs tracking-widest"
            />
          </div>
          {error && (
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-black py-5 sm:py-6 rounded-2xl sm:rounded-3xl font-black uppercase italic tracking-[0.2em] text-white shadow-2xl hover:bg-zinc-800 active:scale-[0.97] transition-all touch-bounce text-sm sm:text-base"
          >
            Sincronizar Protocolo
          </button>
        </form>

        <div className="flex justify-center gap-4 opacity-10">
          <Star className="w-4 h-4" />
          <Star className="w-4 h-4" />
          <Star className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

const AppMain: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);

  return (
    <Router>
      {!user ? <Login onLogin={handleLogin} /> : <AppContent user={user} onLogout={handleLogout} />}
    </Router>
  );
};

export default AppMain;
