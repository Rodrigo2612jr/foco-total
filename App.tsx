export default function App() {
  return null;
}

/*
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Plus, Trash2, Target, ClipboardList, 
  Heart, Menu, X, CheckCircle2, Circle, 
  StickyNote, Star, LogOut, Zap, Filter, Calendar as CalendarIcon, Edit3
} from 'lucide-react';
import { format, isSameDay, subDays, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Goal, Task, Priority, Category, User, ThemeType } from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { WeeklyChart } from './components/WeeklyChart';
import { CategoryChart } from './components/CategoryChart';
import { db } from './services/firebase';

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

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

          {!isChecklistView && (
            <DashboardHeader {...(isTasksPath ? statsTasks : statsGoals)} theme={user.theme} />
  payload: { goals: Goal[]; tasks: Task[]; notes: string[] }
) => {
          {isChecklistGoalsPath ? (
            <section className={`flex flex-col space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Separadas por filtro</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGoals(goals.filter(g => !g.isDaily))}
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
                {currentGoals.map(g => (
                  <ChecklistItem 
                    key={g.id} 
                    title={g.title} 
                    category={g.category} 
                    completed={g.completed} 
                    date={g.date}
                    theme={user.theme}
                    onToggle={() => setGoals(goals.map(x => x.id === g.id ? {...x, completed: !x.completed} : x))}
                    onDelete={() => setGoals(goals.filter(x => x.id !== g.id))}
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
            <section className={`flex flex-col space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Tarefas do Dia</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Checklist diário</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTasks(tasks.filter(t => !t.isDaily))}
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
                {currentTasks.map(t => (
                  <ChecklistItem 
                    key={t.id} 
                    title={t.title} 
                    category={t.category}
                    completed={t.completed} 
                    date={t.scheduledDate}
                    theme={user.theme}
                    isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                    onToggle={() => setTasks(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))}
                    onDelete={() => setTasks(tasks.filter(x => x.id !== t.id))}
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
      saveUserData(user.username, { goals, tasks, notes }).catch(() => {
        // ignore save errors
      });
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [goals, tasks, notes, user.username, isLoading, canSave]);

  const applyFilters = (items: any[], dateKey: string, includeOverdue = false) => {
    const selectedDate = parseISO(filterDate);
    return items.filter(item => {
      const itemDate = parseISO(item[dateKey]);
      const itemCategory = (item.category ?? 'Outros') as Category;
      const matchesDate = isSameDay(itemDate, selectedDate);
      const matchesDaily = item.isDaily ? (!item.completed || matchesDate) : false;
      const matchesOverdue = includeOverdue && !item.completed && isBefore(itemDate, selectedDate);
      const matchesCategory = filterCategory === 'TUDO' || itemCategory === filterCategory;
      const matchesStatus = filterStatus === 'TODOS'
        ? true
        : filterStatus === 'CONCLUIDOS'
          ? item.completed
          : !item.completed;
      return (matchesDate || matchesDaily || matchesOverdue) && matchesCategory && matchesStatus;
    });
  };

  const currentGoals = useMemo(() => applyFilters(goals, 'date'), [goals, filterDate, filterCategory, filterStatus]);
  const currentTasks = useMemo(() => applyFilters(tasks, 'scheduledDate', true), [tasks, filterDate, filterCategory, filterStatus]);

  const handleQuickDateFilter = (type: 'HOJE' | 'ONTEM') => {
    setActiveFilterTab(type);
    const date = type === 'HOJE' ? new Date() : subDays(new Date(), 1);
    setFilterDate(format(date, 'yyyy-MM-dd'));
  };

  const statsGoals = {
    total: goals.length,
    completed: goals.filter(g => g.completed).length,
    pending: goals.length - goals.filter(g => g.completed).length,
    rate: goals.length ? ((goals.filter(g => g.completed).length / goals.length) * 100).toFixed(0) : '0'
  };

  const statsTasks = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.length - tasks.filter(t => t.completed).length,
    rate: tasks.length ? ((tasks.filter(t => t.completed).length / tasks.length) * 100).toFixed(0) : '0'
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
    return days.map(day => {
      const label = format(day, 'EEE', { locale: ptBR }).toUpperCase();
      let total = 0;
      let completed = 0;

      goals.forEach(goal => {
        const goalDate = parseISO(goal.date);
        const isForDay = isSameDay(goalDate, day) || goal.isDaily;
        if (!isForDay) return;
        total += 1;
        if (goal.completed) completed += 1;
      });

      tasks.forEach(task => {
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

  const Sidebar = () => (
    <aside className={`w-72 flex flex-col h-full ${isFem ? 'bg-white border-r border-rose-100' : 'bg-black border-r border-zinc-900'}`}>
      <div className="p-12 text-center">
        <h1 className={`text-2xl font-black italic tracking-tighter uppercase ${isFem ? 'text-rose-800' : 'text-white'}`}>
          {isFem ? <Heart className="inline w-6 h-6 mr-2 fill-current" /> : <Zap className="inline w-6 h-6 mr-2 text-blue-500" />}
          {isFem ? 'YASMIN' : user.name} <span className={isFem ? 'text-rose-500' : 'text-blue-500'}>FOCO</span>
        </h1>
      </div>
      <nav className="flex-1 px-6 space-y-3">
        <Link to="/metas" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isGoalsPath ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
          <Target className="w-4 h-4" /> Dashboard Metas
        </Link>
        <Link to="/tarefas" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isTasksPath ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
          <ClipboardList className="w-4 h-4" /> Dashboard Tarefas
        </Link>
        <Link to="/checklist-metas" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isChecklistGoalsPath ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
          <CheckCircle2 className="w-4 h-4" /> Checklist Metas
        </Link>
        <Link to="/checklist-tarefas" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isChecklistTasksPath ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
          <CheckCircle2 className="w-4 h-4" /> Checklist Tarefas
        </Link>
      </nav>
      <div className="p-10 border-t border-rose-100">
        <button onClick={onLogout} className={`flex items-center gap-3 text-[10px] font-black uppercase transition-all ${isFem ? 'text-rose-400 hover:text-rose-700' : 'text-zinc-700 hover:text-white'}`}>
          <LogOut className="w-4 h-4" /> Finalizar Protocolo
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`flex min-h-screen ${isFem ? 'bg-[#FFF8F8]' : 'bg-black text-white'}`}>
      {/* MOBILE HEADER */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 p-5 border-b flex justify-between items-center backdrop-blur-xl ${isFem ? 'bg-white/80 border-rose-100 text-rose-700' : 'bg-black/80 border-zinc-900 text-white'}`}>
        <button onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
        <span className="font-black italic uppercase text-[10px] tracking-widest">
          {isChecklistGoalsPath
            ? 'CHECKLIST METAS'
            : isChecklistTasksPath
              ? 'CHECKLIST TAREFAS'
              : isTasksPath
                ? 'DASHBOARD TAREFAS'
                : 'DASHBOARD METAS'}
        </span>
        <div className="w-6 h-6" />
      </div>

      <div className="hidden lg:block sticky top-0 h-screen shrink-0">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-72 h-full animate-in slide-in-from-left duration-500"><Sidebar /></div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full mt-16 lg:mt-0 overflow-x-hidden">
        <div className="space-y-16 animate-fade-in">
          {isLoading && (
            <div className={`px-6 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}>
              Sincronizando dados...
            </div>
          )}

          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none ${isFem ? 'text-rose-800' : 'text-white'}`}>
                {isChecklistGoalsPath
                  ? 'Checklist de Metas'
                  : isChecklistTasksPath
                    ? 'Checklist de Tarefas'
                    : isTasksPath
                      ? 'Dashboard de Tarefas'
                      : 'Dashboard de Metas'}
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.5em] mt-4 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>
                {isChecklistView
                  ? 'Execução • Registros do Dia'
                  : isTasksPath
                    ? 'Produtividade • Execução Tática'
                    : 'Foco • Metas Estratégicas'}
              </p>
            </div>
            
            {/* GLOBAL FILTER BAR */}
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 rounded-[2.5rem] w-full sm:w-auto ${isFem ? 'bg-white shadow-xl shadow-rose-200/20 border border-rose-100' : 'bg-zinc-900 border border-zinc-800'}`}>
              <div className="flex gap-1 p-1">
                {(['HOJE', 'ONTEM'] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => handleQuickDateFilter(tab)}
                    className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase transition-all ${activeFilterTab === tab ? (isFem ? 'bg-rose-600 text-white shadow-lg shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-300 hover:text-rose-600' : 'text-zinc-600')}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 px-4 border-l border-rose-100">
                <CalendarIcon className={`w-4 h-4 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`} />
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setActiveFilterTab('OUTRO');
                  }}
                  className={`bg-transparent text-[10px] font-black uppercase outline-none w-full sm:w-auto ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}
                />
              </div>
              <div className="flex items-center gap-3 px-4 border-l border-rose-100">
                <Filter className={`w-4 h-4 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`} />
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer w-full sm:w-auto ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}
                >
                  <option value="TUDO">Categorias</option>
                  <option value="Trabalho">Trabalho</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Estudos">Estudos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="flex items-center gap-3 px-4 border-l border-rose-100">
                <CheckCircle2 className={`w-4 h-4 ${isFem ? 'text-rose-300' : 'text-zinc-600'}`} />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'TODOS' | 'PENDENTES' | 'CONCLUIDOS')}
                  className={`bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer w-full sm:w-auto ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}
                >
                  <option value="TODOS">Status</option>
                  <option value="PENDENTES">Pendentes</option>
                  <option value="CONCLUIDOS">Concluídos</option>
                </select>
              </div>
            </div>
          </div>

          {location.pathname !== '/checklist' && (
            <DashboardHeader {...stats} theme={user.theme} />
          )}
          {location.pathname === '/checklist' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* --- CHECKLIST METAS --- */}
              <section className={`flex flex-col space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Separadas por filtro</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGoals(goals.filter(g => !g.isDaily))}
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
                  {currentGoals.map(g => (
                    <ChecklistItem 
                      key={g.id} 
                      title={g.title} 
                      category={g.category} 
                      completed={g.completed} 
                      date={g.date}
                      theme={user.theme}
                      onToggle={() => setGoals(goals.map(x => x.id === g.id ? {...x, completed: !x.completed} : x))}
                      onDelete={() => setGoals(goals.filter(x => x.id !== g.id))}
                      onEdit={() => editGoal(g)}
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

              {/* --- CHECKLIST TAREFAS --- */}
              <section className={`flex flex-col space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Tarefas do Dia</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Checklist diário</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTasks(tasks.filter(t => !t.isDaily))}
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
                  {currentTasks.map(t => (
                    <ChecklistItem 
                      key={t.id} 
                      title={t.title} 
                      category={t.category}
                      completed={t.completed} 
                      date={t.scheduledDate}
                      theme={user.theme}
                      isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                      onToggle={() => setTasks(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))}
                      onDelete={() => setTasks(tasks.filter(x => x.id !== t.id))}
                      onEdit={() => editTask(t)}
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
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* --- DASHBOARD DE METAS --- */}
            {isGoalsPath && (
            <section className={`flex flex-col space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Objetivos Estratégicos</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGoals(goals.filter(g => !g.isDaily))}
                    className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                  >
                    Remover diários
                  </button>
                  <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                    <Target className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                  </div>
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const title = f.get('title') as string;
                const cat = f.get('category') as Category;
                const date = (f.get('date') as string) || filterDate;
                const isDaily = f.get('daily') === 'on';
                if(!title) return;
                setGoals([{ 
                  id: crypto.randomUUID(), 
                  title, 
                  completed: false, 
                  date: date + 'T12:00:00', 
                  category: cat, 
                  priority: Priority.MEDIUM,
                  isDaily
                }, ...goals]);
                e.currentTarget.reset();
              }} className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <input name="title" required placeholder="Definir nova meta..." className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <select name="category" className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}>
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
                  <button type="submit" className={`w-full p-3 sm:p-4 rounded-[1.75rem] text-white shadow-lg active:scale-95 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300/60' : 'bg-blue-600'} flex items-center justify-center gap-2`}>
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Adicionar Meta</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {currentGoals.map(g => (
                  <ChecklistItem 
                    key={g.id} 
                    title={g.title} 
                    category={g.category} 
                    completed={g.completed} 
                    date={g.date}
                    theme={user.theme}
                    onToggle={() => setGoals(goals.map(x => x.id === g.id ? {...x, completed: !x.completed} : x))}
                    onDelete={() => setGoals(goals.filter(x => x.id !== g.id))}
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

            {/* --- DASHBOARD DE TAREFAS --- */}
            {isTasksPath && (
            <section className={`flex flex-col space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Checklist</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Execução Diária</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTasks(tasks.filter(t => !t.isDaily))}
                    className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                  >
                    Remover diários
                  </button>
                  <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                    <ClipboardList className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                  </div>
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const title = f.get('title') as string;
                const date = (f.get('date') as string) || filterDate;
                const isDaily = f.get('daily') === 'on';
                const category = (f.get('category') as Category) || 'Outros';
                if(!title) return;
                setTasks([{ 
                  id: crypto.randomUUID(), 
                  title, 
                  completed: false, 
                  scheduledDate: date + 'T12:00:00', 
                  createdAt: new Date().toISOString(),
                  category,
                  isDaily
                }, ...tasks]);
                e.currentTarget.reset();
              }} className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <input name="title" required placeholder="O que precisa ser executado?" className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <select name="category" defaultValue="Outros" className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}>
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
                  <button type="submit" className={`w-full p-3 sm:p-4 rounded-[1.75rem] text-white shadow-lg active:scale-95 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300/60' : 'bg-blue-600'} flex items-center justify-center gap-2`}>
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Adicionar Tarefa</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {currentTasks.map(t => (
                  <ChecklistItem 
                    key={t.id} 
                    title={t.title} 
                    category={t.category}
                    completed={t.completed} 
                    date={t.scheduledDate}
                    theme={user.theme}
                    isOverdue={!t.completed && isBefore(parseISO(t.scheduledDate), parseISO(filterDate))}
                    onToggle={() => setTasks(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))}
                    onDelete={() => setTasks(tasks.filter(x => x.id !== t.id))}
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

          {/* --- LEMBRETES (NOTES) --- */}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {notes.map((note, idx) => (
                <div key={idx} className={`p-8 rounded-[3rem] min-h-[160px] relative group border transition-all hover:-translate-y-2 duration-500 ${isFem ? 'bg-white border-rose-100 text-rose-950 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                  <button onClick={() => setNotes(notes.filter((_, i) => i !== idx))} className="absolute top-6 right-6 text-rose-200 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingNoteIndex(idx);
                      setEditingNoteText(note);
                    }}
                    className={`absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-all ${isFem ? 'text-rose-200 hover:text-rose-700' : 'text-zinc-600 hover:text-blue-400'}`}
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <p className="text-xs font-bold leading-relaxed uppercase tracking-wider">{note}</p>
                </div>
              ))}
              <button onClick={() => {
                const text = prompt("O que você quer lembrar?");
                if(text) setNotes([...notes, text]);
              }} className={`p-8 rounded-[3.5rem] min-h-[160px] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all group ${isFem ? 'border-rose-200 text-rose-400 hover:border-rose-700 hover:text-rose-800 hover:bg-rose-100/20' : 'border-zinc-800 text-zinc-700 hover:border-zinc-600'}`}>
                <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Adicionar Nota</span>
              </button>
            </div>
          </section>
          )}

          {/* ANALYTICS SECTION */}
          {!isChecklistView && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
            <WeeklyChart 
              data={weeklyStats}
              title="PERFORMANCE SEMANAL" 
            />
            <CategoryChart items={categoryItems} />
          </div>
          )}
          </>
          )}

        </div>
      </main>

      {editingGoal && goalDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingGoal(null)} />
          <div className={`relative w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-8 border ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Editar Meta</h3>
              <button onClick={() => setEditingGoal(null)} className={`${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setGoals(goals.map(g => g.id === editingGoal.id ? {
                  ...g,
                  title: goalDraft.title.trim() || g.title,
                  date: (goalDraft.date || format(parseISO(g.date), 'yyyy-MM-dd')) + 'T12:00:00',
                  category: goalDraft.category,
                  priority: goalDraft.priority,
                  isDaily: goalDraft.isDaily,
                  description: goalDraft.description.trim()
                } : g));
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingTask(null)} />
          <div className={`relative w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-8 border ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Editar Tarefa</h3>
              <button onClick={() => setEditingTask(null)} className={`${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTasks(tasks.map(t => t.id === editingTask.id ? {
                  ...t,
                  title: taskDraft.title.trim() || t.title,
                  scheduledDate: (taskDraft.date || format(parseISO(t.scheduledDate), 'yyyy-MM-dd')) + 'T12:00:00',
                  category: taskDraft.category,
                  isDaily: taskDraft.isDaily
                } : t));
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingNoteIndex(null)} />
          <div className={`relative w-full max-w-xl rounded-[2.5rem] p-6 sm:p-8 border ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-black uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Editar Nota</h3>
              <button onClick={() => setEditingNoteIndex(null)} className={`${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingNoteIndex === null) return;
                setNotes(notes.map((n, i) => i === editingNoteIndex ? editingNoteText.trim() || n : n));
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

// --- AUTH LOGIC (GENERIC & PROFESSIONAL) ---

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
    <div className="fixed inset-0 bg-white flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-white to-white"></div>
      <div className="relative w-full max-w-md bg-white border border-zinc-100 p-8 sm:p-12 lg:p-16 rounded-[4.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] space-y-12 sm:space-y-16 text-center">
        <div className="space-y-6">
          <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl transform rotate-12 hover:rotate-0 transition-transform duration-500">
            <Zap className="w-12 h-12 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-black">SISTEMA <span className="text-zinc-300">DE FOCO</span></h1>
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.8em] mt-3">Auth Protocol v5.0</p>
          </div>
        </div>
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="relative group">
            <input 
              value={user} 
              onChange={e => {
                setUser(e.target.value);
                if (error) setError('');
              }} 
              placeholder="IDENTIFICAÇÃO DO USUÁRIO" 
              className="w-full bg-zinc-50 border border-zinc-100 p-6 rounded-3xl font-black uppercase text-zinc-800 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-300 text-center text-xs tracking-widest" 
            />
          </div>
          {error && (
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">
              {error}
            </div>
          )}
          <button 
            type="submit"
            className="w-full bg-black py-6 rounded-3xl font-black uppercase italic tracking-[0.2em] text-white shadow-2xl hover:bg-zinc-800 active:scale-95 transition-all"
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (u: User) => {
    setUser(u);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      {!user ? <Login onLogin={handleLogin} /> : <AppContent user={user} onLogout={handleLogout} />}
    </Router>
  );
};

export default App;

*/
