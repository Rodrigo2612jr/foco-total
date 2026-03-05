import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter as Router, Link, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  ClipboardList,
  Edit3,
  Filter,
  Heart,
  LogOut,
  Plus,
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

import { Category, Goal, Priority, Task, ThemeType, User } from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { WeeklyChart } from './components/WeeklyChart';
import { CategoryChart } from './components/CategoryChart';
import { db } from './services/firebase';

const getEmptyData = () => ({
  goals: [] as Goal[],
  tasks: [] as Task[],
  notes: [] as string[]
});

const loadUserData = async (username: string) => {
  const ref = doc(db, 'users', username);
  const snap = await getDoc(ref);
  if (!snap.exists()) return getEmptyData();
  const data = snap.data() as Partial<{ goals: Goal[]; tasks: Task[]; notes: string[] }>;
  return {
    goals: Array.isArray(data.goals) ? data.goals : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    notes: Array.isArray(data.notes) ? data.notes : []
  };
};

const saveUserData = async (
  username: string,
  payload: { goals: Goal[]; tasks: Task[]; notes: string[] }
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
}> = ({ title, category, completed, date, theme, onToggle, onDelete, onEdit, isOverdue }) => {
  const isFem = theme === 'feminine';
  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] transition-all duration-500 border touch-bounce ${
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
        className={`shrink-0 transition-transform active:scale-75 p-1 ${
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
          className={`text-xs sm:text-sm font-bold uppercase tracking-tight truncate ${
            completed ? 'line-through text-rose-300' : isFem ? 'text-zinc-900' : 'text-zinc-200'
          }`}
        >
          {title}
        </p>
        <div className="flex items-center gap-2 sm:gap-3 mt-1">
          {category && (
            <span
              className={`text-[7px] sm:text-[8px] font-black uppercase px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
                isFem ? 'bg-rose-100 text-rose-700' : 'bg-blue-900/30 text-blue-400'
              }`}
            >
              {category}
            </span>
          )}
          <span
            className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${
              isFem ? 'text-rose-400' : 'text-zinc-600'
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

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    hasLoadedRef.current = false;

    loadUserData(user.username)
      .then(({ goals, tasks, notes }) => {
        if (!isMounted) return;
        setGoals(goals);
        setTasks(tasks);
        setNotes(notes);
        setCanSave(true);
        hasLoadedRef.current = true;
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setGoals([]);
        setTasks([]);
        setNotes([]);
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
      saveUserData(user.username, { goals, tasks, notes }).catch(() => undefined);
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [goals, tasks, notes, user.username, isLoading, canSave]);

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
  const currentTasks = useMemo(
    () => applyFilters(tasks, 'scheduledDate', true),
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

  const isGoalsPath = location.pathname === '/' || location.pathname === '/metas';
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

  const navItems = [
    { path: '/metas', label: 'Metas', icon: Target, active: isGoalsPath },
    { path: '/tarefas', label: 'Tarefas', icon: ClipboardList, active: isTasksPath },
    { path: '/checklist-metas', label: 'Check Metas', icon: CheckCircle2, active: isChecklistGoalsPath },
    { path: '/checklist-tarefas', label: 'Check Tarefas', icon: CheckCircle2, active: isChecklistTasksPath },
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
          {isChecklistGoalsPath
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

      <main className="flex-1 p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full mt-14 lg:mt-0 overflow-x-hidden main-content-area">
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
                  {isChecklistGoalsPath
                    ? 'Checklist de Metas'
                    : isChecklistTasksPath
                      ? 'Checklist de Tarefas'
                      : isTasksPath
                        ? 'Dashboard de Tarefas'
                        : 'Dashboard de Metas'}
                </h2>
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] mt-2 sm:mt-4 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>
                  {isChecklistView ? 'Execução • Registros do Dia' : isTasksPath ? 'Produtividade • Execução Tática' : 'Foco • Metas Estratégicas'}
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
                  <option value="Trabalho">Trabalho</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Estudos">Estudos</option>
                  <option value="Outros">Outros</option>
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

          {!isChecklistView && (
            <DashboardHeader {...(isTasksPath ? statsTasks : statsGoals)} theme={user.theme} />
          )}

          {isChecklistGoalsPath ? (
            <section className={`flex flex-col space-y-4 sm:space-y-8 p-4 sm:p-8 lg:p-8 rounded-2xl sm:rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
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

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
            <section className={`flex flex-col space-y-4 sm:space-y-8 p-4 sm:p-8 lg:p-8 rounded-2xl sm:rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
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

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {currentTasks.map((t) => (
                  <ChecklistItem
                    key={t.id}
                    title={t.title}
                    category={t.category}
                    completed={t.completed}
                    date={t.scheduledDate}
                    theme={user.theme}
                    isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                    onToggle={() => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)))}
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
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12">
                {isGoalsPath && (
                  <section className={`flex flex-col space-y-4 sm:space-y-8 p-4 sm:p-8 lg:p-8 rounded-2xl sm:rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
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
                            <option value="Trabalho">Categoria: Trabalho</option>
                            <option value="Pessoal">Categoria: Pessoal</option>
                            <option value="Saúde">Categoria: Saúde</option>
                            <option value="Estudos">Categoria: Estudos</option>
                            <option value="Outros">Categoria: Outros</option>
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

                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
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
                  <section className={`flex flex-col space-y-4 sm:space-y-8 p-4 sm:p-8 lg:p-8 rounded-2xl sm:rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
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
                            defaultValue="Outros"
                            className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                          >
                            <option value="Trabalho">Categoria: Trabalho</option>
                            <option value="Pessoal">Categoria: Pessoal</option>
                            <option value="Saúde">Categoria: Saúde</option>
                            <option value="Estudos">Categoria: Estudos</option>
                            <option value="Outros">Categoria: Outros</option>
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

                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {currentTasks.map((t) => (
                        <ChecklistItem
                          key={t.id}
                          title={t.title}
                          category={t.category}
                          completed={t.completed}
                          date={t.scheduledDate}
                          theme={user.theme}
                          isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                          onToggle={() => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)))}
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
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingGoal(null)} />
          <div className={`relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border mobile-modal-content-sheet sm:!max-h-none sm:!position-static sm:!rounded-[2.5rem] overflow-y-auto ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="pull-indicator sm:hidden" />
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Editar Meta</h3>
              <button onClick={() => setEditingGoal(null)} className={`${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
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
              className="space-y-4"
            >
              <input
                value={goalDraft.title}
                onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })}
                placeholder="Título da meta"
                className={`w-full p-4 rounded-[2rem] text-xs font-bold uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300' : 'bg-black border border-zinc-800 text-white'}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={goalDraft.date}
                  onChange={(e) => setGoalDraft({ ...goalDraft, date: e.target.value })}
                  className={`p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                />
                <select
                  value={goalDraft.category}
                  onChange={(e) => setGoalDraft({ ...goalDraft, category: e.target.value as Category })}
                  className={`p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                >
                  <option value="Trabalho">Trabalho</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Estudos">Estudos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={goalDraft.priority}
                  onChange={(e) => setGoalDraft({ ...goalDraft, priority: e.target.value as Priority })}
                  className={`p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                >
                  <option value={Priority.LOW}>Baixa</option>
                  <option value={Priority.MEDIUM}>Média</option>
                  <option value={Priority.HIGH}>Alta</option>
                </select>
                <label className={`flex items-center justify-center gap-2 px-4 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}>
                  <input
                    type="checkbox"
                    checked={goalDraft.isDaily}
                    onChange={(e) => setGoalDraft({ ...goalDraft, isDaily: e.target.checked })}
                    className="accent-rose-500"
                  />
                  Todos os dias
                </label>
              </div>
              <textarea
                value={goalDraft.description}
                onChange={(e) => setGoalDraft({ ...goalDraft, description: e.target.value })}
                placeholder="Descrição rápida"
                className={`w-full p-4 rounded-[2rem] text-xs font-bold uppercase outline-none min-h-[120px] ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300' : 'bg-black border border-zinc-800 text-white'}`}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-600 text-white shadow-rose-300/60' : 'bg-blue-600 text-white'}`}
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTask && taskDraft && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTask(null)} />
          <div className={`relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border mobile-modal-content-sheet sm:!max-h-none sm:!position-static sm:!rounded-[2.5rem] overflow-y-auto ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="pull-indicator sm:hidden" />
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Editar Tarefa</h3>
              <button onClick={() => setEditingTask(null)} className={`${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTasks(tasks.map((t) => (t.id === editingTask.id ? {
                  ...t,
                  title: taskDraft.title.trim() || t.title,
                  scheduledDate: (taskDraft.date || format(parseISO(t.scheduledDate), 'yyyy-MM-dd')) + 'T12:00:00',
                  category: taskDraft.category,
                  isDaily: taskDraft.isDaily
                } : t)));
                setEditingTask(null);
              }}
              className="space-y-4"
            >
              <input
                value={taskDraft.title}
                onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })}
                placeholder="Título da tarefa"
                className={`w-full p-4 rounded-[2rem] text-xs font-bold uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300' : 'bg-black border border-zinc-800 text-white'}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={taskDraft.date}
                  onChange={(e) => setTaskDraft({ ...taskDraft, date: e.target.value })}
                  className={`p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                />
                <select
                  value={taskDraft.category}
                  onChange={(e) => setTaskDraft({ ...taskDraft, category: e.target.value as Category })}
                  className={`p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                >
                  <option value="Trabalho">Trabalho</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Estudos">Estudos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-400 border border-zinc-800'}`}>
                <input
                  type="checkbox"
                  checked={taskDraft.isDaily}
                  onChange={(e) => setTaskDraft({ ...taskDraft, isDaily: e.target.checked })}
                  className="accent-rose-500"
                />
                Todos os dias
              </label>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-600 text-white shadow-rose-300/60' : 'bg-blue-600 text-white'}`}
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingNoteIndex !== null && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingNoteIndex(null)} />
          <div className={`relative w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border mobile-modal-content-sheet sm:!max-h-none sm:!position-static sm:!rounded-[2.5rem] overflow-y-auto ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="pull-indicator sm:hidden" />
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Editar Nota</h3>
              <button onClick={() => setEditingNoteIndex(null)} className={`${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingNoteIndex === null) return;
                setNotes(notes.map((n, i) => (i === editingNoteIndex ? editingNoteText.trim() || n : n)));
                setEditingNoteIndex(null);
              }}
              className="space-y-4"
            >
              <textarea
                value={editingNoteText}
                onChange={(e) => setEditingNoteText(e.target.value)}
                placeholder="Nota"
                className={`w-full p-4 rounded-[2rem] text-xs font-bold uppercase outline-none min-h-[160px] ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300' : 'bg-black border border-zinc-800 text-white'}`}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingNoteIndex(null)}
                  className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-600 text-white shadow-rose-300/60' : 'bg-blue-600 text-white'}`}
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
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
