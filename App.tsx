
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Plus, Trash2, Target, ClipboardList, 
  Heart, Sparkles, Menu, X, CheckCircle2, Circle, 
  StickyNote, Star, LogOut, Zap, Filter, Calendar as CalendarIcon
} from 'lucide-react';
import { format, isSameDay, subDays, parseISO } from 'date-fns';
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

const getEmptyData = () => ({ goals: [] as Goal[], tasks: [] as Task[], notes: [] as string[] });

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

const saveUserData = async (username: string, payload: { goals: Goal[]; tasks: Task[]; notes: string[] }) => {
  const ref = doc(db, 'users', username);
  await setDoc(ref, payload, { merge: true });
};

// --- SUB-COMPONENTS ---

const ChecklistItem: React.FC<{ 
  title: string; 
  category?: string; 
  completed: boolean; 
  date: string;
  theme: ThemeType;
  onToggle: () => void; 
  onDelete: () => void 
}> = ({ title, category, completed, date, theme, onToggle, onDelete }) => {
  const isFem = theme === 'feminine';
  return (
    <div className={`flex items-center gap-4 p-5 rounded-[2rem] transition-all duration-500 ${
      completed 
        ? (isFem ? 'bg-rose-100/20 opacity-40 scale-[0.98]' : 'bg-zinc-900/40 opacity-50') 
        : (isFem ? 'bg-white shadow-xl shadow-rose-200/20 border border-rose-200/50' : 'bg-zinc-900 border border-zinc-800')
    }`}>
      <button onClick={onToggle} className={`shrink-0 transition-transform active:scale-75 ${completed ? (isFem ? 'text-rose-600' : 'text-blue-500') : (isFem ? 'text-rose-300' : 'text-zinc-700')}`}>
        {completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
      </button>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-bold uppercase tracking-tight truncate ${completed ? 'line-through text-rose-300' : (isFem ? 'text-zinc-900' : 'text-zinc-200')}`}>{title}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {category && <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-blue-900/30 text-blue-400'}`}>{category}</span>}
          <span className={`text-[8px] font-black uppercase tracking-widest ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>{format(parseISO(date), 'dd MMM', { locale: ptBR })}</span>
        </div>
      </div>
      <button onClick={onDelete} className={`transition-all hover:scale-110 ${isFem ? 'text-rose-200 hover:text-rose-700' : 'text-zinc-800 hover:text-rose-500'}`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- MAIN APP CONTENT ---

const AppContent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const isFem = user.theme === 'feminine';
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  
  // Advanced Filter States
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
        hasLoadedRef.current = true;
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setGoals([]);
        setTasks([]);
        setNotes([]);
        hasLoadedRef.current = true;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user.username]);

  useEffect(() => {
    if (!hasLoadedRef.current || isLoading) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveUserData(user.username, { goals, tasks, notes }).catch(() => {
        // ignore save errors
      });
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [goals, tasks, notes, user.username, isLoading]);

  const applyFilters = (items: any[], dateKey: string) => {
    return items.filter(item => {
      const itemDate = parseISO(item[dateKey]);
      const itemCategory = (item.category ?? 'Outros') as Category;
      const matchesDate = isSameDay(itemDate, parseISO(filterDate));
      const matchesCategory = filterCategory === 'TUDO' || itemCategory === filterCategory;
      const matchesStatus = filterStatus === 'TODOS'
        ? true
        : filterStatus === 'CONCLUIDOS'
          ? item.completed
          : !item.completed;
      return matchesDate && matchesCategory && matchesStatus;
    });
  };

  const currentGoals = useMemo(() => applyFilters(goals, 'date'), [goals, filterDate, filterCategory]);
  const currentTasks = useMemo(() => applyFilters(tasks, 'scheduledDate'), [tasks, filterDate, filterCategory]);

  const handleQuickDateFilter = (type: 'HOJE' | 'ONTEM') => {
    setActiveFilterTab(type);
    const date = type === 'HOJE' ? new Date() : subDays(new Date(), 1);
    setFilterDate(format(date, 'yyyy-MM-dd'));
  };

  const stats = {
    total: goals.length + tasks.length,
    completed: goals.filter(g => g.completed).length + tasks.filter(t => t.completed).length,
    pending: (goals.length + tasks.length) - (goals.filter(g => g.completed).length + tasks.filter(t => t.completed).length),
    rate: (goals.length + tasks.length) ? (((goals.filter(g => g.completed).length + tasks.filter(t => t.completed).length) / (goals.length + tasks.length)) * 100).toFixed(0) : "0"
  };

  const Sidebar = () => (
    <aside className={`w-72 flex flex-col h-full ${isFem ? 'bg-white border-r border-rose-100' : 'bg-black border-r border-zinc-900'}`}>
      <div className="p-12 text-center">
        <h1 className={`text-2xl font-black italic tracking-tighter uppercase ${isFem ? 'text-rose-800' : 'text-white'}`}>
          {isFem ? <Heart className="inline w-6 h-6 mr-2 fill-current" /> : <Zap className="inline w-6 h-6 mr-2 text-blue-500" />}
          {isFem ? 'YASMIN' : user.name} <span className={isFem ? 'text-rose-500' : 'text-blue-500'}>FOCO</span>
        </h1>
      </div>
      <nav className="flex-1 px-6 space-y-3">
        <Link to="/" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${location.pathname === '/' ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
          <LayoutDashboard className="w-4 h-4" /> Painel Geral
        </Link>
        <Link to="/checklist" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${location.pathname === '/checklist' ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
          <ClipboardList className="w-4 h-4" /> Checklist
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
        <span className="font-black italic uppercase text-[10px] tracking-widest">{location.pathname === '/checklist' ? 'CHECKLIST' : `${isFem ? 'YASMIN' : user.name} FOCO`}</span>
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

      <main className="flex-1 p-6 lg:p-16 max-w-7xl mx-auto w-full mt-16 lg:mt-0 overflow-x-hidden">
        <div className="space-y-16 animate-fade-in">
          {isLoading && (
            <div className={`px-6 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}>
              Sincronizando dados...
            </div>
          )}

          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <h2 className={`text-5xl font-black italic uppercase tracking-tighter leading-none ${isFem ? 'text-rose-800' : 'text-white'}`}>{location.pathname === '/checklist' ? 'Checklist Diário' : 'Painel de Controle'}</h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.5em] mt-4 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>{location.pathname === '/checklist' ? 'Execução • Registros do Dia' : 'Protocolo Ativo • Sincronizado'}</p>
            </div>
            
            {/* GLOBAL FILTER BAR */}
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 rounded-[2.5rem] w-full sm:w-auto ${isFem ? 'bg-white shadow-xl shadow-rose-200/20 border border-rose-100' : 'bg-zinc-900 border border-zinc-800'}`}>
              <div className="flex gap-1 p-1">
                {(['HOJE', 'ONTEM'] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => handleQuickDateFilter(tab)}
                    className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase transition-all ${activeFilterTab === tab ? (isFem ? 'bg-rose-600 text-white shadow-lg shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-300 hover:text-rose-600' : 'text-zinc-600')}`}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* --- CHECKLIST METAS --- */}
              <section className={`flex flex-col space-y-8 p-10 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Separadas por filtro</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                    <Target className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
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
              <section className={`flex flex-col space-y-8 p-10 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Tarefas do Dia</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Checklist diário</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                    <ClipboardList className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
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
                      onToggle={() => setTasks(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))}
                      onDelete={() => setTasks(tasks.filter(x => x.id !== t.id))}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* --- DASHBOARD DE METAS --- */}
            <section className={`flex flex-col space-y-8 p-10 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Metas do Dia</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Objetivos Estratégicos</p>
                </div>
                <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                  <Target className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const title = f.get('title') as string;
                const cat = f.get('category') as Category;
                const date = (f.get('date') as string) || filterDate;
                if(!title) return;
                setGoals([{ 
                  id: crypto.randomUUID(), 
                  title, 
                  completed: false, 
                  date: date + 'T12:00:00', 
                  category: cat, 
                  priority: Priority.MEDIUM 
                }, ...goals]);
                e.currentTarget.reset();
              }} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input name="title" required placeholder="Definir nova meta..." className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`} />
                  <input
                    type="date"
                    name="date"
                    defaultValue={filterDate}
                    className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none w-full sm:w-auto ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                  />
                  <div className="flex gap-2">
                    <select name="category" className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Pessoal">Pessoal</option>
                      <option value="Saúde">Saúde</option>
                    </select>
                    <button type="submit" className={`p-4 sm:p-5 rounded-[2rem] text-white shadow-xl active:scale-90 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300' : 'bg-blue-600'}`}>
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
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

            {/* --- DASHBOARD DE TAREFAS --- */}
            <section className={`flex flex-col space-y-8 p-10 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>Checklist</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Execução Diária</p>
                </div>
                <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
                  <ClipboardList className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
                </div>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const title = f.get('title') as string;
                const date = (f.get('date') as string) || filterDate;
                const category = (f.get('category') as Category) || 'Outros';
                if(!title) return;
                setTasks([{ 
                  id: crypto.randomUUID(), 
                  title, 
                  completed: false, 
                  scheduledDate: date + 'T12:00:00', 
                  createdAt: new Date().toISOString(),
                  category
                }, ...tasks]);
                e.currentTarget.reset();
              }} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input name="title" required placeholder="O que precisa ser executado?" className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`} />
                  <input
                    type="date"
                    name="date"
                    defaultValue={filterDate}
                    className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none w-full sm:w-auto ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                  />
                  <select name="category" defaultValue="Outros" className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}>
                    <option value="Trabalho">Trabalho</option>
                    <option value="Pessoal">Pessoal</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Estudos">Estudos</option>
                    <option value="Outros">Outros</option>
                  </select>
                  <button type="submit" className={`p-4 sm:p-5 rounded-[2rem] text-white shadow-xl active:scale-90 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300' : 'bg-blue-600'}`}>
                    <Plus className="w-6 h-6" />
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
                    onToggle={() => setTasks(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))}
                    onDelete={() => setTasks(tasks.filter(x => x.id !== t.id))}
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
          </div>

          {/* --- LEMBRETES (NOTES) --- */}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {notes.map((note, idx) => (
                <div key={idx} className={`p-8 rounded-[3rem] min-h-[160px] relative group border transition-all hover:-translate-y-2 duration-500 ${isFem ? 'bg-white border-rose-100 text-rose-950 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                  <button onClick={() => setNotes(notes.filter((_, i) => i !== idx))} className="absolute top-6 right-6 text-rose-200 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-5 h-5" />
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

          {/* ANALYTICS SECTION */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <WeeklyChart 
              data={[]} 
              title="PERFORMANCE SEMANAL" 
            />
            <CategoryChart tasks={goals} />
          </div>
          </div>
          )}

        </div>
      </main>
    </div>
  );
};

// --- AUTH LOGIC (GENERIC & PROFESSIONAL) ---

const Login: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [user, setUser] = useState('');
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-white to-white"></div>
      <div className="relative w-full max-w-md bg-white border border-zinc-100 p-16 rounded-[4.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] space-y-16 text-center">
        <div className="space-y-6">
          <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl transform rotate-12 hover:rotate-0 transition-transform duration-500">
            <Zap className="w-12 h-12 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-black">SISTEMA <span className="text-zinc-300">DE FOCO</span></h1>
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.8em] mt-3">Auth Protocol v5.0</p>
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="relative group">
            <input 
              value={user} 
              onChange={e => setUser(e.target.value)} 
              placeholder="IDENTIFICAÇÃO DO USUÁRIO" 
              className="w-full bg-zinc-50 border border-zinc-100 p-6 rounded-3xl font-black uppercase text-zinc-800 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-300 text-center text-xs tracking-widest" 
            />
          </div>
          <button 
            onClick={() => {
              const u = user.toLowerCase().trim();
              if (u === 'pascoto' || u === 'pascot') {
                onLogin({ username: 'pascoto', name: 'PASCOTO', theme: 'masculine' });
              } else {
                onLogin({ username: u || 'yasmin', name: user.toUpperCase() || 'YASMIN', theme: 'feminine' });
              }
            }} 
            className="w-full bg-black py-6 rounded-3xl font-black uppercase italic tracking-[0.2em] text-white shadow-2xl hover:bg-zinc-800 active:scale-95 transition-all"
          >
            Sincronizar Protocolo
          </button>
        </div>
        
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
  const [user, setUser] = useState<User | null>(() => {
    const storage = getSafeStorage();
    if (!storage) return null;
    try {
      const saved = storage.getItem('foco_v5_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (u: User) => {
    setUser(u);
    const storage = getSafeStorage();
    if (!storage) return;
    try {
      storage.setItem('foco_v5_user', JSON.stringify(u));
    } catch {
      // ignore storage write errors
    }
  };

  const handleLogout = () => {
    setUser(null);
    const storage = getSafeStorage();
    if (!storage) return;
    try {
      storage.removeItem('foco_v5_user');
    } catch {
      // ignore storage write errors
    }
  };

  return (
    <Router>
      {!user ? <Login onLogin={handleLogin} /> : <AppContent user={user} onLogout={handleLogout} />}
    </Router>
  );
};

export default App;
