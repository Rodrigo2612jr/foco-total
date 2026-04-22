import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Download,
  Edit3,
  Flame,
  Pause,
  Play,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import { format, isSameDay, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  CategoryDef,
  Frequency,
  RecurringTask,
  Task,
  ThemeType
} from '../types';
import { frequencyLabel, frequencyShort } from '../services/recurringService';
import { AVAILABLE_TEMPLATES, applyTemplate } from '../services/recurringTemplates';
import { getProductivityInsight } from '../services/geminiService';
import {
  notificationsPermission,
  notificationsSupported,
  requestNotificationPermission
} from '../services/notifications';

const DEFAULT_COLORS = [
  '#E11D48', '#DB2777', '#7C3AED', '#2563EB',
  '#0891B2', '#059669', '#F59E0B', '#EA580C', '#475569'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props {
  theme: ThemeType;
  categories: CategoryDef[];
  recurringTasks: RecurringTask[];
  tasks: Task[];
  onUpdateCategories: (cats: CategoryDef[]) => void;
  onUpdateRecurrings: (recs: RecurringTask[]) => void;
}

export const RecurringTasksPanel: React.FC<Props> = ({
  theme,
  categories,
  recurringTasks,
  tasks,
  onUpdateCategories,
  onUpdateRecurrings
}) => {
  const isFem = theme === 'feminine';
  const [editingRec, setEditingRec] = useState<RecurringTask | null>(null);
  const [editingCat, setEditingCat] = useState<CategoryDef | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    notificationsSupported() ? notificationsPermission() : 'denied'
  );

  const handleToggleNotifications = async () => {
    if (!notificationsSupported()) {
      alert('Seu navegador não suporta notificações.');
      return;
    }
    if (notifPerm === 'granted') {
      alert('Notificações já estão ativadas. Para desativar, use as configurações do navegador.');
      return;
    }
    const result = await requestNotificationPermission();
    setNotifPerm(result);
    if (result === 'granted') {
      new Notification('Rotina ativada 🔔', {
        body: 'Você receberá lembretes das suas tarefas recorrentes.',
        tag: 'focototal-welcome'
      });
    }
  };

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, RecurringTask[]>();
    recurringTasks.forEach((r) => {
      const key = r.categoryId ?? r.category ?? 'sem-cat';
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    });
    return map;
  }, [recurringTasks]);

  // ---------- Streak: últimos 14 dias ----------
  const streakDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(today, 13 - i);
      const dayTasks = tasks.filter(
        (t) => t.recurringTaskId && isSameDay(parseISO(t.scheduledDate), d)
      );
      const total = dayTasks.length;
      const completed = dayTasks.filter((t) => t.completed).length;
      const rate = total ? completed / total : null;
      return { date: d, total, completed, rate };
    });
  }, [tasks]);

  const streakIntensity = (rate: number | null) => {
    if (rate === null) return isFem ? 'bg-rose-50' : 'bg-zinc-900';
    if (rate === 0) return isFem ? 'bg-red-200/60' : 'bg-red-900/40';
    if (rate < 0.5) return isFem ? 'bg-rose-200' : 'bg-blue-900/50';
    if (rate < 1) return isFem ? 'bg-rose-400' : 'bg-blue-700';
    return isFem ? 'bg-rose-600' : 'bg-blue-500';
  };

  // ---------- Handlers ----------
  const saveRec = (rec: RecurringTask) => {
    const idx = recurringTasks.findIndex((r) => r.id === rec.id);
    if (idx >= 0) {
      const next = [...recurringTasks];
      next[idx] = rec;
      onUpdateRecurrings(next);
    } else {
      onUpdateRecurrings([rec, ...recurringTasks]);
    }
    setEditingRec(null);
  };

  const deleteRec = (id: string) => {
    onUpdateRecurrings(recurringTasks.filter((r) => r.id !== id));
  };

  const togglePause = (rec: RecurringTask) => {
    saveRec({ ...rec, active: !rec.active });
  };

  const saveCat = (cat: CategoryDef) => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    if (idx >= 0) {
      const next = [...categories];
      next[idx] = cat;
      onUpdateCategories(next);
    } else {
      onUpdateCategories([...categories, cat]);
    }
    setEditingCat(null);
  };

  const deleteCat = (id: string) => {
    onUpdateCategories(categories.filter((c) => c.id !== id));
    // desliga categoryId em recorrentes afetadas (mas preserva .category string)
    const affected = recurringTasks.map((r) =>
      r.categoryId === id ? { ...r, categoryId: undefined } : r
    );
    onUpdateRecurrings(affected);
  };

  const importTemplate = (templateId: string) => {
    const tpl = AVAILABLE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const result = applyTemplate({
      template: tpl,
      existingCategories: categories,
      existingRecurrings: recurringTasks
    });
    onUpdateCategories(result.mergedCategories);
    onUpdateRecurrings(result.mergedRecurrings);
    setShowTemplate(false);
    alert(
      `Importado: ${result.addedCategories} categorias novas, ${result.addedRecurrings} tarefas recorrentes novas.`
    );
  };

  const suggestWithAI = async () => {
    setLoadingAi(true);
    try {
      const tip = await getProductivityInsight(tasks);
      setAiTip(tip);
    } catch {
      setAiTip('Não consegui contatar a IA agora. Tenta de novo em alguns segundos.');
    } finally {
      setLoadingAi(false);
    }
  };

  // ---------- Styles ----------
  const cardBase = `rounded-2xl sm:rounded-[2.5rem] border p-4 sm:p-6 ${
    isFem
      ? 'bg-white border-rose-100 shadow-xl shadow-rose-200/20'
      : 'bg-zinc-900/60 border-zinc-800'
  }`;
  const btnPrimary = `px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white active:scale-95 transition-all ${
    isFem ? 'bg-rose-600 shadow-lg shadow-rose-300/60' : 'bg-blue-600'
  }`;
  const btnGhost = `px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all ${
    isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'
  }`;

  const emptyRec: RecurringTask = {
    id: '',
    title: '',
    categoryId: categories[0]?.id,
    category: categories[0]?.name,
    frequency: 'daily',
    active: true,
    createdAt: ''
  };
  const emptyCat: CategoryDef = {
    id: '',
    name: '',
    color: DEFAULT_COLORS[0],
    createdAt: ''
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* ---------- HEADER ---------- */}
      <div className={cardBase}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
              <Repeat className={`w-6 h-6 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
            </div>
            <div>
              <h2
                className={`text-xl sm:text-2xl font-black italic uppercase ${
                  isFem ? 'text-rose-700' : 'text-white'
                }`}
              >
                Rotina
              </h2>
              <p
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${
                  isFem ? 'text-rose-400' : 'text-zinc-600'
                }`}
              >
                Tarefas que se repetem
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowTemplate(true)} className={btnGhost}>
              <Download className="w-3 h-3 inline mr-1" /> Importar template
            </button>
            <button onClick={handleToggleNotifications} className={btnGhost}>
              {notifPerm === 'granted' ? (
                <><Bell className="w-3 h-3 inline mr-1" /> Lembretes ativos</>
              ) : (
                <><BellOff className="w-3 h-3 inline mr-1" /> Ativar lembretes</>
              )}
            </button>
            <button
              onClick={suggestWithAI}
              disabled={loadingAi}
              className={`${btnGhost} disabled:opacity-50`}
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              {loadingAi ? 'Analisando...' : 'Insight IA'}
            </button>
            <button onClick={() => setEditingRec({ ...emptyRec })} className={btnPrimary}>
              <Plus className="w-3 h-3 inline mr-1" /> Nova recorrente
            </button>
          </div>
        </div>

        {aiTip && (
          <div
            className={`mt-4 p-4 rounded-2xl text-xs font-bold leading-relaxed ${
              isFem ? 'bg-rose-50 text-rose-900 border border-rose-200' : 'bg-blue-900/20 text-blue-200 border border-blue-800/50'
            }`}
          >
            <Sparkles className="inline w-3 h-3 mr-2" />
            {aiTip}
          </div>
        )}
      </div>

      {/* ---------- STREAK HEATMAP ---------- */}
      <div className={cardBase}>
        <div className="flex items-center gap-3 mb-4">
          <Flame className={`w-5 h-5 ${isFem ? 'text-rose-600' : 'text-orange-500'}`} />
          <h3
            className={`text-sm font-black italic uppercase ${
              isFem ? 'text-rose-700' : 'text-white'
            }`}
          >
            Cumprimento (14 dias)
          </h3>
        </div>
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
          {streakDays.map((d, i) => (
            <div
              key={i}
              title={`${format(d.date, "dd/MM 'EEE'", { locale: ptBR })} — ${d.completed}/${d.total}`}
              className={`flex-1 min-w-[22px] sm:min-w-[28px] aspect-square rounded-lg sm:rounded-xl ${streakIntensity(d.rate)} flex items-end justify-center pb-1`}
            >
              <span
                className={`text-[7px] sm:text-[9px] font-black ${
                  d.rate === null || d.rate < 0.5
                    ? isFem
                      ? 'text-rose-700'
                      : 'text-zinc-400'
                    : 'text-white'
                }`}
              >
                {format(d.date, 'dd')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- CATEGORIAS ---------- */}
      <div className={cardBase}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Tag className={`w-5 h-5 ${isFem ? 'text-rose-600' : 'text-blue-500'}`} />
            <h3
              className={`text-sm font-black italic uppercase ${
                isFem ? 'text-rose-700' : 'text-white'
              }`}
            >
              Categorias
            </h3>
          </div>
          <button onClick={() => setEditingCat({ ...emptyCat })} className={btnGhost}>
            <Plus className="w-3 h-3 inline mr-1" /> Nova
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 && (
            <p className={`text-[10px] font-bold ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>
              Nenhuma categoria ainda. Crie a primeira ou importe um template.
            </p>
          )}
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditingCat(c)}
              className="px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm active:scale-95 transition-all flex items-center gap-2"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
              <Edit3 className="w-3 h-3 opacity-70" />
            </button>
          ))}
        </div>
      </div>

      {/* ---------- LISTA DE RECORRENTES AGRUPADAS POR CATEGORIA ---------- */}
      {recurringTasks.length === 0 ? (
        <div className={`${cardBase} text-center py-10`}>
          <Repeat
            className={`w-10 h-10 mx-auto mb-3 opacity-30 ${
              isFem ? 'text-rose-600' : 'text-zinc-500'
            }`}
          />
          <p
            className={`text-[10px] font-black uppercase tracking-[0.3em] ${
              isFem ? 'text-rose-400' : 'text-zinc-500'
            }`}
          >
            Nenhuma recorrente. Crie uma ou importe o template.
          </p>
        </div>
      ) : (
        Array.from(byCategory.entries()).map(([catKey, recs]) => {
          const cat = catById.get(catKey);
          const catName = cat?.name ?? recs[0]?.category ?? 'Sem categoria';
          const color = cat?.color ?? (isFem ? '#E11D48' : '#2563EB');
          return (
            <div key={catKey} className={cardBase}>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <h3
                  className={`text-sm font-black italic uppercase ${
                    isFem ? 'text-rose-700' : 'text-white'
                  }`}
                >
                  {catName}
                </h3>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ml-auto ${
                    isFem ? 'text-rose-400' : 'text-zinc-500'
                  }`}
                >
                  {recs.length} {recs.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>
              <div className="space-y-2">
                {recs.map((r) => (
                  <RecurringRow
                    key={r.id}
                    rec={r}
                    theme={theme}
                    onEdit={() => setEditingRec(r)}
                    onDelete={() => deleteRec(r.id)}
                    onTogglePause={() => togglePause(r)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* ---------- MODAL: EDIT RECURRING ---------- */}
      {editingRec && (
        <RecurringEditorModal
          rec={editingRec}
          categories={categories}
          theme={theme}
          onClose={() => setEditingRec(null)}
          onSave={saveRec}
        />
      )}

      {/* ---------- MODAL: EDIT CATEGORY ---------- */}
      {editingCat && (
        <CategoryEditorModal
          cat={editingCat}
          theme={theme}
          onClose={() => setEditingCat(null)}
          onSave={saveCat}
          onDelete={() => {
            if (editingCat.id) deleteCat(editingCat.id);
            setEditingCat(null);
          }}
        />
      )}

      {/* ---------- MODAL: TEMPLATE ---------- */}
      {showTemplate && (
        <TemplatePickerModal
          theme={theme}
          onClose={() => setShowTemplate(false)}
          onPick={importTemplate}
        />
      )}
    </div>
  );
};

// ==================== Sub-components ====================

const RecurringRow: React.FC<{
  rec: RecurringTask;
  theme: ThemeType;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
}> = ({ rec, theme, onEdit, onDelete, onTogglePause }) => {
  const isFem = theme === 'feminine';
  const Icon =
    rec.frequency === 'daily' ? CalendarCheck : rec.frequency === 'weekly' ? CalendarDays : CalendarRange;
  return (
    <div
      className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border transition-all ${
        rec.active
          ? isFem
            ? 'bg-rose-50/30 border-rose-100'
            : 'bg-zinc-900 border-zinc-800'
          : isFem
            ? 'bg-rose-50/10 border-rose-100 opacity-50'
            : 'bg-zinc-900/40 border-zinc-800 opacity-50'
      }`}
    >
      <div
        className={`p-2 rounded-xl shrink-0 ${
          isFem ? 'bg-rose-100 text-rose-600' : 'bg-zinc-800 text-blue-500'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs sm:text-sm font-bold uppercase truncate ${
            isFem ? 'text-zinc-900' : 'text-zinc-200'
          }`}
        >
          {rec.title}
        </p>
        <p
          className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
            isFem ? 'text-rose-400' : 'text-zinc-500'
          }`}
        >
          {frequencyShort(rec.frequency)} • {frequencyLabel(rec)}
          {!rec.active && ' • PAUSADA'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onTogglePause}
          className={`p-2 rounded-xl active:scale-90 transition-all ${
            isFem ? 'text-rose-400 hover:text-rose-700' : 'text-zinc-500 hover:text-blue-400'
          }`}
          title={rec.active ? 'Pausar' : 'Retomar'}
        >
          {rec.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={onEdit}
          className={`p-2 rounded-xl active:scale-90 transition-all ${
            isFem ? 'text-rose-400 hover:text-rose-700' : 'text-zinc-500 hover:text-blue-400'
          }`}
          title="Editar"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className={`p-2 rounded-xl active:scale-90 transition-all ${
            isFem ? 'text-rose-400 hover:text-red-600' : 'text-zinc-500 hover:text-red-500'
          }`}
          title="Remover"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const RecurringEditorModal: React.FC<{
  rec: RecurringTask;
  categories: CategoryDef[];
  theme: ThemeType;
  onClose: () => void;
  onSave: (rec: RecurringTask) => void;
}> = ({ rec, categories, theme, onClose, onSave }) => {
  const isFem = theme === 'feminine';
  const [title, setTitle] = useState(rec.title);
  const [categoryId, setCategoryId] = useState(rec.categoryId ?? categories[0]?.id ?? '');
  const [frequency, setFrequency] = useState<Frequency>(rec.frequency);
  const [dayOfWeek, setDayOfWeek] = useState<number>(rec.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(rec.dayOfMonth ?? 1);

  const handleSave = () => {
    if (!title.trim()) return;
    const cat = categories.find((c) => c.id === categoryId);
    onSave({
      id: rec.id || crypto.randomUUID(),
      title: title.trim(),
      categoryId: cat?.id,
      category: cat?.name ?? rec.category,
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      active: rec.active ?? true,
      createdAt: rec.createdAt || new Date().toISOString(),
      notes: rec.notes
    });
  };

  const panelCls = `relative w-full max-w-lg rounded-[2rem] p-5 sm:p-7 border ${
    isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
  }`;
  const inputCls = `w-full p-3 sm:p-4 rounded-2xl text-xs font-bold uppercase outline-none ${
    isFem
      ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300'
      : 'bg-black border border-zinc-800 text-white'
  }`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={panelCls}>
        <div className="flex items-center justify-between mb-5">
          <h3
            className={`text-lg font-black uppercase ${
              isFem ? 'text-rose-700' : 'text-white'
            }`}
          >
            {rec.id ? 'Editar recorrente' : 'Nova recorrente'}
          </h3>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa recorrente"
            className={inputCls}
            autoFocus
          />

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`p-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                  frequency === f
                    ? isFem
                      ? 'bg-rose-600 text-white'
                      : 'bg-blue-600 text-white'
                    : isFem
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {f === 'daily' ? 'Diária' : f === 'weekly' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>

          {frequency === 'weekly' && (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDayOfWeek(i)}
                  className={`p-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                    dayOfWeek === i
                      ? isFem
                        ? 'bg-rose-600 text-white'
                        : 'bg-blue-600 text-white'
                      : isFem
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {frequency === 'monthly' && (
            <div>
              <label
                className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${
                  isFem ? 'text-rose-500' : 'text-zinc-500'
                }`}
              >
                Dia do mês (1-31)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                className={inputCls}
              />
              <p
                className={`text-[8px] mt-1 uppercase tracking-wider ${
                  isFem ? 'text-rose-400' : 'text-zinc-600'
                }`}
              >
                Se o mês não tiver esse dia, cai no último dia do mês.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] ${
              isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white ${
              isFem ? 'bg-rose-600' : 'bg-blue-600'
            }`}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryEditorModal: React.FC<{
  cat: CategoryDef;
  theme: ThemeType;
  onClose: () => void;
  onSave: (cat: CategoryDef) => void;
  onDelete: () => void;
}> = ({ cat, theme, onClose, onSave, onDelete }) => {
  const isFem = theme === 'feminine';
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color || DEFAULT_COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: cat.id || crypto.randomUUID(),
      name: name.trim(),
      color,
      createdAt: cat.createdAt || new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-md rounded-[2rem] p-5 sm:p-7 border ${
          isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className={`text-lg font-black uppercase ${
              isFem ? 'text-rose-700' : 'text-white'
            }`}
          >
            {cat.id ? 'Editar categoria' : 'Nova categoria'}
          </h3>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da categoria"
            autoFocus
            className={`w-full p-3 sm:p-4 rounded-2xl text-xs font-bold uppercase outline-none ${
              isFem
                ? 'bg-rose-50/50 text-rose-900 placeholder:text-rose-200 border border-rose-100 focus:border-rose-300'
                : 'bg-black border border-zinc-800 text-white'
            }`}
          />
          <div className="flex flex-wrap gap-2">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full transition-transform ${
                  color === c ? 'ring-4 ring-offset-2 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c, ...(color === c ? { ['--tw-ring-color' as any]: c } : {}) }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6">
          {cat.id ? (
            <button
              onClick={onDelete}
              className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-3 h-3 inline mr-1" /> Remover
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] ${
                isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white ${
                isFem ? 'bg-rose-600' : 'bg-blue-600'
              }`}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TemplatePickerModal: React.FC<{
  theme: ThemeType;
  onClose: () => void;
  onPick: (templateId: string) => void;
}> = ({ theme, onClose, onPick }) => {
  const isFem = theme === 'feminine';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-xl rounded-[2rem] p-5 sm:p-7 border ${
          isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className={`text-lg font-black uppercase ${
              isFem ? 'text-rose-700' : 'text-white'
            }`}
          >
            Importar template
          </h3>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {AVAILABLE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                isFem
                  ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50'
                  : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900'
              }`}
            >
              <div
                className={`text-sm font-black uppercase ${
                  isFem ? 'text-rose-700' : 'text-white'
                }`}
              >
                {t.name}
              </div>
              <p
                className={`text-[10px] font-bold mt-1 ${
                  isFem ? 'text-rose-500' : 'text-zinc-400'
                }`}
              >
                {t.description}
              </p>
              <p
                className={`text-[9px] font-black uppercase tracking-widest mt-2 ${
                  isFem ? 'text-rose-400' : 'text-zinc-500'
                }`}
              >
                {t.categories.length} categorias • {t.recurrings.length} recorrentes
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
