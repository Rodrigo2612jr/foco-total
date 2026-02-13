
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Plus, Trash2, Target, ClipboardList, 
  Heart, Sparkles, Menu, X, CheckCircle2, Circle, 
  StickyNote, Star, LogOut, Zap, Filter, Calendar as CalendarIcon, Edit3
} from 'lucide-react';
import { format, isSameDay, subDays, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Goal, Task, Priority, Category, User, ThemeType, Project, StrategyBlock, StrategyBlockType, StrategyEdge } from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { WeeklyChart } from './components/WeeklyChart';
import { CategoryChart } from './components/CategoryChart';
import { StrategyFlow } from './components/StrategyFlow';
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
  notes: [] as string[],
  projects: [] as Project[],
  blocks: [] as StrategyBlock[],
  edges: [] as StrategyEdge[]
});

const loadUserData = async (username: string) => {
  const ref = doc(db, 'users', username);
  const snap = await getDoc(ref);
  if (!snap.exists()) return getEmptyData();
  const data = snap.data() as Partial<{ goals: Goal[]; tasks: Task[]; notes: string[]; projects: Project[]; blocks: StrategyBlock[]; edges: StrategyEdge[] }>;
  return {
    goals: Array.isArray(data.goals) ? data.goals : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    edges: Array.isArray(data.edges) ? data.edges : []
  };
};

const saveUserData = async (
  username: string,
  payload: { goals: Goal[]; tasks: Task[]; notes: string[]; projects: Project[]; blocks: StrategyBlock[]; edges: StrategyEdge[] }
) => {
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
  onDelete: () => void;
  onEdit?: () => void;
  isOverdue?: boolean;
}> = ({ title, category, completed, date, theme, onToggle, onDelete, onEdit, isOverdue }) => {
  const isFem = theme === 'feminine';
  return (
    <div className={`flex items-center gap-4 p-5 rounded-[2rem] transition-all duration-500 border ${
      completed 
        ? (isFem ? 'bg-rose-100/20 opacity-40 scale-[0.98]' : 'bg-zinc-900/40 opacity-50') 
        : (isFem ? 'bg-white shadow-xl shadow-rose-200/20 border border-rose-200/50' : 'bg-zinc-900 border border-zinc-800')
    } ${!completed && isOverdue ? (isFem ? 'border-red-400/80' : 'border-red-500/80') : ''}`}>
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
      <div className="flex items-center gap-3">
        {onEdit && (
          <button onClick={onEdit} className={`transition-all hover:scale-110 ${isFem ? 'text-rose-200 hover:text-rose-700' : 'text-zinc-800 hover:text-blue-400'}`}>
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        <button onClick={onDelete} className={`transition-all hover:scale-110 ${isFem ? 'text-rose-200 hover:text-rose-700' : 'text-zinc-800 hover:text-rose-500'}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP CONTENT ---

const AppContent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const isFem = user.theme === 'feminine';
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Project['company'] | null>(null);

  // States
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [blocks, setBlocks] = useState<StrategyBlock[]>([]);
  const [edges, setEdges] = useState<StrategyEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canSave, setCanSave] = useState(false);
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
      .then(({ goals, tasks, notes, projects, blocks, edges }) => {
        if (!isMounted) return;
        setGoals(goals);
        setTasks(tasks);
        setNotes(notes);
        setProjects(projects);
        setBlocks(blocks);
        setEdges(edges);
        setActiveCompany(null);
        setCanSave(true);
        hasLoadedRef.current = true;
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setGoals([]);
        setTasks([]);
        setNotes([]);
        setProjects([]);
        setBlocks([]);
        setEdges([]);
        setActiveCompany(null);
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
      saveUserData(user.username, { goals, tasks, notes, projects, blocks, edges }).catch(() => {
        // ignore save errors
      });
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [goals, tasks, notes, projects, blocks, edges, user.username, isLoading, canSave]);

  const applyFilters = (items: any[], dateKey: string, includeOverdue = false) => {
    const selectedDate = parseISO(filterDate);
    return items.filter(item => {
      const itemDate = parseISO(item[dateKey]);
      const itemCategory = (item.category ?? 'Outros') as Category;
      const matchesDate = isSameDay(itemDate, selectedDate);
      const matchesDaily = !!item.isDaily;
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

  const stats = {
    total: goals.length + tasks.length,
    completed: goals.filter(g => g.completed).length + tasks.filter(t => t.completed).length,
    pending: (goals.length + tasks.length) - (goals.filter(g => g.completed).length + tasks.filter(t => t.completed).length),
    rate: (goals.length + tasks.length) ? (((goals.filter(g => g.completed).length + tasks.filter(t => t.completed).length) / (goals.length + tasks.length)) * 100).toFixed(0) : "0"
  };

  const editGoal = (goal: Goal) => {
    const title = prompt('Editar meta (título):', goal.title);
    if (title === null) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const dateInput = prompt('Data (YYYY-MM-DD):', format(parseISO(goal.date), 'yyyy-MM-dd'));
    if (dateInput === null) return;
    const categoryInput = prompt('Categoria (Trabalho, Pessoal, Saúde, Estudos, Outros):', goal.category);
    if (categoryInput === null) return;
    const isDaily = confirm('Marcar como diário?');

    setGoals(goals.map(g => g.id === goal.id ? {
      ...g,
      title: trimmedTitle,
      date: (dateInput.trim() || format(parseISO(goal.date), 'yyyy-MM-dd')) + 'T12:00:00',
      category: (categoryInput.trim() as Category) || goal.category,
      isDaily
    } : g));
  };

  const editTask = (task: Task) => {
    const title = prompt('Editar tarefa (título):', task.title);
    if (title === null) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const dateInput = prompt('Data (YYYY-MM-DD):', format(parseISO(task.scheduledDate), 'yyyy-MM-dd'));
    if (dateInput === null) return;
    const categoryInput = prompt('Categoria (Trabalho, Pessoal, Saúde, Estudos, Outros):', task.category ?? 'Outros');
    if (categoryInput === null) return;
    const isDaily = confirm('Marcar como diário?');

    setTasks(tasks.map(t => t.id === task.id ? {
      ...t,
      title: trimmedTitle,
      scheduledDate: (dateInput.trim() || format(parseISO(task.scheduledDate), 'yyyy-MM-dd')) + 'T12:00:00',
      category: (categoryInput.trim() as Category) || task.category,
      isDaily
    } : t));
  };

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

  const isPascoto = user.username === 'pascoto';
  const companies: Project['company'][] = ['Empório Pascoto', 'Pascoto100k'];
  const strategyTypes: StrategyBlockType[] = ['vendas', 'financeiro', 'operacional', 'estrategico', 'funil', 'ads', 'lp', 'email', 'checkout'];

  const getCompanyProjects = (company: Project['company']) =>
    projects.filter(p => p.company === company).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const getProjectBlocks = (projectId: string) =>
    blocks
      .filter(b => b.projectId === projectId)
      .sort((a, b) => a.order - b.order);

  const getProjectEdges = (projectId: string) =>
    edges.filter(e => e.projectId === projectId);

  const addBlockToProject = (projectId: string, payload: Pick<StrategyBlock, 'title' | 'description' | 'type'>) => {
    const existing = getProjectBlocks(projectId);
    const nextIndex = existing.length + 1;
    setBlocks([
      {
        id: crypto.randomUUID(),
        title: payload.title,
        description: payload.description,
        type: payload.type,
        order: nextIndex,
        projectId,
        position: { x: 80 + (nextIndex % 4) * 220, y: 80 + Math.floor(nextIndex / 4) * 160 }
      },
      ...blocks
    ]);
  };

  const addTemplateFunnel = (projectId: string) => {
    const baseX = 80;
    const baseY = 80;
    const templateBlocks: StrategyBlock[] = [
      { id: crypto.randomUUID(), title: 'Atrair', description: 'Anúncios + Conteúdo', type: 'ads', order: 1, projectId, position: { x: baseX, y: baseY } },
      { id: crypto.randomUUID(), title: 'Capturar', description: 'Landing Page', type: 'lp', order: 2, projectId, position: { x: baseX + 240, y: baseY } },
      { id: crypto.randomUUID(), title: 'Nutrir', description: 'Sequência de e-mails', type: 'email', order: 3, projectId, position: { x: baseX + 480, y: baseY } },
      { id: crypto.randomUUID(), title: 'Converter', description: 'Checkout + Oferta', type: 'checkout', order: 4, projectId, position: { x: baseX + 720, y: baseY } }
    ];
    const templateEdges: StrategyEdge[] = [
      { id: crypto.randomUUID(), source: templateBlocks[0].id, target: templateBlocks[1].id, projectId },
      { id: crypto.randomUUID(), source: templateBlocks[1].id, target: templateBlocks[2].id, projectId },
      { id: crypto.randomUUID(), source: templateBlocks[2].id, target: templateBlocks[3].id, projectId }
    ];
    setBlocks([...templateBlocks, ...blocks]);
    setEdges([...templateEdges, ...edges]);
  };

  const addTemplateStructure = (projectId: string) => {
    const baseX = 80;
    const baseY = 80;
    const templateBlocks: StrategyBlock[] = [
      { id: crypto.randomUUID(), title: 'Vendas', description: 'Processo comercial', type: 'vendas', order: 1, projectId, position: { x: baseX, y: baseY } },
      { id: crypto.randomUUID(), title: 'Operacional', description: 'Entrega & execução', type: 'operacional', order: 2, projectId, position: { x: baseX, y: baseY + 180 } },
      { id: crypto.randomUUID(), title: 'Financeiro', description: 'Fluxo de caixa', type: 'financeiro', order: 3, projectId, position: { x: baseX + 260, y: baseY } },
      { id: crypto.randomUUID(), title: 'Estratégico', description: 'OKRs e metas', type: 'estrategico', order: 4, projectId, position: { x: baseX + 260, y: baseY + 180 } }
    ];
    const templateEdges: StrategyEdge[] = [
      { id: crypto.randomUUID(), source: templateBlocks[0].id, target: templateBlocks[2].id, projectId },
      { id: crypto.randomUUID(), source: templateBlocks[1].id, target: templateBlocks[3].id, projectId }
    ];
    setBlocks([...templateBlocks, ...blocks]);
    setEdges([...templateEdges, ...edges]);
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
        {isPascoto && (
          <Link to="/strategy" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${location.pathname === '/strategy' ? (isFem ? 'bg-rose-600 text-white shadow-2xl shadow-rose-300/30' : 'bg-blue-600 text-white') : (isFem ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' : 'text-zinc-600 hover:bg-zinc-900')}`}>
            <Sparkles className="w-4 h-4" /> Estratégia
          </Link>
        )}
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
          {location.pathname === '/checklist'
            ? 'CHECKLIST'
            : location.pathname === '/strategy'
              ? 'ESTRATÉGIA'
              : `${isFem ? 'YASMIN' : user.name} FOCO`}
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
          {location.pathname !== '/strategy' && (
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none ${isFem ? 'text-rose-800' : 'text-white'}`}>
                {location.pathname === '/strategy'
                  ? 'Estratégia Empresarial'
                  : location.pathname === '/checklist'
                    ? 'Checklist Diário'
                    : 'Painel de Controle'}
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.5em] mt-4 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>
                {location.pathname === '/strategy'
                  ? 'Empório Pascoto • Pascoto100k'
                  : location.pathname === '/checklist'
                    ? 'Execução • Registros do Dia'
                    : 'Protocolo Ativo • Sincronizado'}
              </p>
            </div>
            
            {/* GLOBAL FILTER BAR */}
            {location.pathname !== '/strategy' && (
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
            )}
          </div>
          )}

          {location.pathname !== '/checklist' && location.pathname !== '/strategy' && (
            <DashboardHeader {...stats} theme={user.theme} />
          )}

          {location.pathname === '/strategy' ? (
            <div className="space-y-12">
              {!isPascoto ? (
                <div className={`p-10 rounded-[3rem] text-center text-[10px] font-black uppercase tracking-[0.4em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}>
                  Acesso restrito ao Pascoto
                </div>
              ) : (
                <div className="space-y-10">
                  {!activeCompany ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                      {companies.map(company => (
                        <button
                          key={company}
                          onClick={() => setActiveCompany(company)}
                          className={`p-8 sm:p-12 rounded-[3.5rem] text-left border transition-all hover:-translate-y-1 ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20 text-rose-800' : 'bg-zinc-900/40 border-zinc-800 text-white'}`}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Acesso</div>
                          <div className="text-2xl sm:text-3xl font-black italic uppercase mt-4">{company}</div>
                          <div className={`text-[9px] font-black uppercase tracking-[0.3em] mt-4 ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>Abrir workspace</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <section className={`space-y-6 sm:space-y-8 p-5 sm:p-8 lg:p-8 rounded-[3.5rem] border transition-all ${isFem ? 'bg-white border-rose-100 shadow-2xl shadow-rose-200/20' : 'bg-zinc-900/40 border-zinc-800'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                          <h3 className={`text-2xl font-black italic uppercase ${isFem ? 'text-rose-700' : 'text-white'}`}>{activeCompany}</h3>
                          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-2 ${isFem ? 'text-rose-400' : 'text-zinc-600'}`}>Funis e Estruturas Estratégicas</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveCompany(null)}
                            className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}
                          >
                            Voltar
                          </button>
                        </div>
                      </div>

                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          const title = (f.get('title') as string)?.trim();
                          const type = (f.get('type') as 'funil' | 'estrutura') || 'funil';
                          if (!title) return;
                          setProjects([
                            {
                              id: crypto.randomUUID(),
                              title,
                              type,
                              createdAt: new Date().toISOString(),
                              company: activeCompany
                            },
                            ...projects
                          ]);
                          e.currentTarget.reset();
                        }}
                        className="flex flex-col lg:flex-row gap-3"
                      >
                        <input
                          name="title"
                          required
                          placeholder="Nome do funil ou estrutura"
                          className={`flex-1 p-4 sm:p-5 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 focus:bg-white border border-transparent focus:border-rose-200' : 'bg-black border border-zinc-800'}`}
                        />
                        <select
                          name="type"
                          className={`p-4 sm:p-5 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-rose-50/50 text-rose-600' : 'bg-black text-zinc-600'}`}
                        >
                          <option value="funil">Funil</option>
                          <option value="estrutura">Estrutura</option>
                        </select>
                        <button type="submit" className={`p-4 sm:p-5 rounded-[2rem] text-white shadow-xl active:scale-90 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300' : 'bg-blue-600'}`}>
                          <Plus className="w-6 h-6" />
                        </button>
                      </form>

                      <div className="space-y-6">
                        {getCompanyProjects(activeCompany).map(project => (
                          <div key={project.id} className={`p-5 sm:p-6 lg:p-6 rounded-[3rem] border ${isFem ? 'bg-rose-50/40 border-rose-100' : 'bg-black border-zinc-800'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h4 className={`text-xl font-black uppercase ${isFem ? 'text-rose-800' : 'text-white'}`}>{project.title}</h4>
                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>{project.type}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setProjects(projects.filter(p => p.id !== project.id));
                                  setBlocks(blocks.filter(b => b.projectId !== project.id));
                                  setEdges(edges.filter(e => e.projectId !== project.id));
                                }}
                                className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                              >
                                Remover
                              </button>
                            </div>

                            <div className="mt-6 space-y-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => addTemplateFunnel(project.id)}
                                  className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}
                                >
                                  Template Funil
                                </button>
                                <button
                                  onClick={() => addTemplateStructure(project.id)}
                                  className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-900 text-zinc-300'}`}
                                >
                                  Template Estrutura
                                </button>
                                <button
                                  onClick={() => addBlockToProject(project.id, { title: 'Nova Etapa', description: 'Defina a ação', type: 'funil' })}
                                  className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-white text-rose-600 border border-rose-200' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                                >
                                  Adicionar Etapa
                                </button>
                                <button
                                  onClick={() => addBlockToProject(project.id, { title: 'Nota Estratégica', description: 'Insight rápido', type: 'estrategico' })}
                                  className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'bg-white text-rose-600 border border-rose-200' : 'bg-black text-zinc-400 border border-zinc-800'}`}
                                >
                                  Adicionar Nota
                                </button>
                              </div>
                                <StrategyFlow
                                blocks={getProjectBlocks(project.id)}
                                edges={getProjectEdges(project.id)}
                                theme={user.theme}
                                  onEditNode={(nodeId) => {
                                  const target = blocks.find(b => b.id === nodeId);
                                  if (!target) return;
                                  const title = prompt('Título do elemento:', target.title);
                                  if (title === null) return;
                                  const description = prompt('Descrição rápida:', target.description);
                                  if (description === null) return;
                                  setBlocks(blocks.map(b => b.id === nodeId ? { ...b, title: title.trim() || b.title, description: description.trim() || b.description } : b));
                                }}
                                  onDuplicateNode={(nodeId) => {
                                    const target = blocks.find(b => b.id === nodeId);
                                    if (!target) return;
                                    setBlocks([
                                      {
                                        ...target,
                                        id: crypto.randomUUID(),
                                        title: `${target.title} (Cópia)`,
                                        position: target.position ? { x: target.position.x + 30, y: target.position.y + 30 } : undefined
                                      },
                                      ...blocks
                                    ]);
                                  }}
                                onBlocksChange={(updatedBlocks) => {
                                  setBlocks([
                                    ...blocks.filter(b => b.projectId !== project.id),
                                    ...updatedBlocks
                                  ]);
                                }}
                                onEdgesChange={(updatedEdges) => {
                                  setEdges([
                                    ...edges.filter(e => e.projectId !== project.id),
                                    ...updatedEdges.map(e => ({ ...e, projectId: project.id }))
                                  ]);
                                }}
                              />
                            </div>

                            <div className="mt-6 space-y-4">
                              {getProjectBlocks(project.id).map(block => (
                                <div key={block.id} className={`p-4 sm:p-5 rounded-[2rem] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'}`}>
                                  <div className="space-y-2">
                                    <div className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>{block.type}</div>
                                    <div className={`text-sm font-black uppercase ${isFem ? 'text-rose-800' : 'text-white'}`}>{block.title}</div>
                                    <p className={`text-[10px] uppercase tracking-[0.2em] ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>{block.description}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setBlocks(blocks.filter(b => b.id !== block.id));
                                      setEdges(edges.filter(e => e.source !== block.id && e.target !== block.id));
                                    }}
                                    className={`text-[9px] font-black uppercase tracking-[0.3em] ${isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-red-400'}`}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              ))}
                              {getProjectBlocks(project.id).length === 0 && (
                                <div className="text-center py-8 opacity-20">
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sem elementos</p>
                                </div>
                              )}
                            </div>

                            <form
                              onSubmit={e => {
                                e.preventDefault();
                                const f = new FormData(e.currentTarget);
                                const title = (f.get('title') as string)?.trim();
                                const description = (f.get('description') as string)?.trim();
                                const type = (f.get('type') as StrategyBlockType) || 'estrategico';
                                if (!title) return;
                                const currentCount = getProjectBlocks(project.id).length;
                                setBlocks([
                                  {
                                    id: crypto.randomUUID(),
                                    title,
                                    description: description || 'Sem descrição',
                                    type,
                                    order: currentCount + 1,
                                    projectId: project.id
                                  },
                                  ...blocks
                                ]);
                                e.currentTarget.reset();
                              }}
                              className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr,1.4fr,auto] gap-3"
                            >
                              <input
                                name="title"
                                required
                                placeholder="Elemento estratégico"
                                className={`p-4 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-white text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300' : 'bg-black border border-zinc-800'}`}
                              />
                              <select
                                name="type"
                                className={`p-4 rounded-[2rem] text-[10px] font-black uppercase outline-none ${isFem ? 'bg-white text-rose-600 border border-rose-100' : 'bg-black text-zinc-600 border border-zinc-800'}`}
                              >
                                {strategyTypes.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <input
                                name="description"
                                placeholder="Descrição rápida"
                                className={`p-4 rounded-[2rem] text-xs font-bold uppercase outline-none transition-all ${isFem ? 'bg-white text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300' : 'bg-black border border-zinc-800'}`}
                              />
                              <button type="submit" className={`p-4 rounded-[2rem] text-white shadow-xl active:scale-90 transition-all ${isFem ? 'bg-rose-600 shadow-rose-300' : 'bg-blue-600'}`}>
                                <Plus className="w-5 h-5" />
                              </button>
                            </form>
                          </div>
                        ))}
                        {getCompanyProjects(activeCompany).length === 0 && (
                          <div className="text-center py-10 opacity-30">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Nenhum funil/estrutura criado</p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          ) : location.pathname === '/checklist' ? (
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
                    onEdit={() => editGoal(g)}
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
                    onEdit={() => editTask(t)}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
            <WeeklyChart 
              data={weeklyStats}
              title="PERFORMANCE SEMANAL" 
            />
            <CategoryChart items={categoryItems} />
          </div>
          </>
          )}

        </div>
      </main>
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
