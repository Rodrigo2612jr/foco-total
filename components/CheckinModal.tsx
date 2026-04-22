import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { CheckinConfig, Task, ThemeType } from '../types';
import { pushSupported, subscribeToPush } from '../services/push';

interface Props {
  theme: ThemeType;
  tasks: Task[];
  goals: { id: string; title: string; completed: boolean; date: string; category?: string }[];
  whatsappRecipient?: string; // telefone com ou sem + (ex: "+5511999999999" ou "11999999999")
  recipientName?: string; // primeiro nome (ex: "Camila")
  reminderHour?: number;
  reminderMinute?: number;
  onClose: () => void;
  onUpdateConfig: (config: Partial<CheckinConfig>) => void;
  onAddQuickDone: (title: string) => void; // adiciona uma tarefa avulsa já concluída hoje
  onMarkAsCompletedToday: (ids: string[]) => void; // seta completedAt=agora nas IDs (pra entrar na mensagem)
}

const pctFor = (done: number, total: number) =>
  total ? Math.round((done / total) * 100) : 0;

const cleanPhone = (raw: string) => raw.replace(/\D/g, '');

export const CheckinModal: React.FC<Props> = ({
  theme,
  tasks,
  goals,
  whatsappRecipient,
  recipientName,
  reminderHour,
  reminderMinute,
  onClose,
  onUpdateConfig,
  onAddQuickDone,
  onMarkAsCompletedToday
}) => {
  const isFem = theme === 'feminine';
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [phoneInput, setPhoneInput] = useState(whatsappRecipient ?? '');
  const [nameInput, setNameInput] = useState(recipientName ?? '');
  const [hourInput, setHourInput] = useState(String(reminderHour ?? 18).padStart(2, '0'));
  const [minuteInput, setMinuteInput] = useState(String(reminderMinute ?? 0).padStart(2, '0'));
  const [quickInput, setQuickInput] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  // Candidatos: avulsas concluídas que ainda NÃO estão marcadas como "de hoje"
  // (ou seja, não têm completedAt ou completedAt é de outro dia).
  const pickerCandidates = useMemo(() => {
    const t = today;
    return tasks.filter((task) => {
      if (task.recurringTaskId) return false;
      if (!task.completed) return false;
      if (!task.completedAt) return true;
      return !isSameDay(parseISO(task.completedAt), t);
    });
  }, [tasks, today]);

  const togglePick = (id: string) => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pickAll = () => {
    setPickedIds(new Set(pickerCandidates.map((t) => t.id)));
  };

  const confirmPicker = () => {
    if (pickedIds.size === 0) {
      setShowPicker(false);
      return;
    }
    onMarkAsCompletedToday(Array.from(pickedIds));
    setPickedIds(new Set());
    setShowPicker(false);
  };
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  // Auto-sync push subscription: se permission já está granted mas ainda não
  // existe subscription salva (ou está desatualizada), registra silenciosamente.
  useEffect(() => {
    if (notifPerm !== 'granted' || !pushSupported()) return;
    (async () => {
      try {
        const sub = await subscribeToPush();
        if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
          onUpdateConfig({
            pushSubscription: {
              endpoint: sub.endpoint,
              expirationTime: sub.expirationTime ?? null,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
            }
          });
        }
      } catch {
        // silencioso
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifPerm]);

  const requestNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      // Dispara notif de boas-vindas local
      try {
        new Notification('✅ Notificações ativadas!', {
          body: 'Às ' + (reminderHour ?? 18) + ':' + String(reminderMinute ?? 0).padStart(2, '0') + ' eu te aviso pra enviar o check-in.',
          tag: 'welcome-checkin'
        });
      } catch { /* noop */ }

      // Registra push subscription (pra funcionar com app fechado)
      try {
        const sub = await subscribeToPush();
        if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
          onUpdateConfig({
            pushSubscription: {
              endpoint: sub.endpoint,
              expirationTime: sub.expirationTime ?? null,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
            }
          });
        }
      } catch (err) {
        console.error('Push subscribe falhou:', err);
      }
    }
  };

  const today = new Date();
  const todayStr = format(today, "dd 'de' MMMM", { locale: ptBR });

  // ---------- Dados do dia ----------
  const {
    doneRoutine,
    pendingRoutine,
    overdueRoutine,
    doneOther,
    doneGoals,
    routineByCategory
  } = useMemo(() => {
    const target = today;

    const todayTasks = tasks.filter(
      (t) => isSameDay(parseISO(t.scheduledDate), target)
    );

    const routineToday = todayTasks.filter((t) => t.recurringTaskId);

    // Avulsas concluídas HOJE — considera:
    // (a) as que têm completedAt de hoje (comportamento novo, inclui avulsas antigas marcadas hoje)
    // (b) fallback: as agendadas pra hoje e marcadas (retrocompat de dados antigos sem completedAt)
    const doneOther = tasks.filter((t) => {
      if (t.recurringTaskId) return false;
      if (!t.completed) return false;
      if (t.completedAt) return isSameDay(parseISO(t.completedAt), target);
      return isSameDay(parseISO(t.scheduledDate), target);
    });

    const overdue = tasks.filter(
      (t) =>
        t.recurringTaskId &&
        !t.completed &&
        !isSameDay(parseISO(t.scheduledDate), target) &&
        parseISO(t.scheduledDate) < target
    );

    const doneRoutine = routineToday.filter((t) => t.completed);
    const pendingRoutine = routineToday.filter((t) => !t.completed);

    const doneGoalsToday = goals.filter(
      (g) => g.completed && isSameDay(parseISO(g.date), target)
    );

    // Agrupa rotina concluída por categoria
    const routineByCategory = new Map<string, Task[]>();
    doneRoutine.forEach((t) => {
      const cat = t.category ?? 'Outros';
      const arr = routineByCategory.get(cat) ?? [];
      arr.push(t);
      routineByCategory.set(cat, arr);
    });

    return {
      doneRoutine,
      pendingRoutine,
      overdueRoutine: overdue,
      doneOther,
      doneGoals: doneGoalsToday,
      routineByCategory
    };
  }, [tasks, goals, today]);

  // ---------- Monta o texto do check-in ----------
  const message = useMemo(() => {
    const totalRoutine = doneRoutine.length + pendingRoutine.length;
    const pct = pctFor(doneRoutine.length, totalRoutine);
    const greeting = recipientName ? `Oi, ${recipientName}!` : 'Oi!';
    const lines: string[] = [];

    lines.push(`*📋 Check-in — ${todayStr}*`);
    lines.push('');
    lines.push(greeting);
    lines.push('');
    lines.push(`Fechando o dia com o resumo das atividades:`);
    lines.push('');

    // --- Rotina ---
    if (totalRoutine > 0) {
      lines.push(`*🔁 Rotina diária*`);
      lines.push(`Concluídas: ${doneRoutine.length}/${totalRoutine} (${pct}%)`);
      lines.push('');

      if (doneRoutine.length > 0) {
        lines.push(`*✅ Concluídas:*`);
        Array.from(routineByCategory.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([cat, list]) => {
            lines.push(`_${cat}_`);
            list.forEach((t) => lines.push(`• ${t.title}`));
            lines.push('');
          });
      }

      if (pendingRoutine.length > 0) {
        lines.push(`*⏳ Pendentes hoje:*`);
        pendingRoutine.forEach((t) => lines.push(`• ${t.title}`));
        lines.push('');
      }
    }

    // --- Atrasadas ---
    if (overdueRoutine.length > 0) {
      lines.push(`*⚠️ Atrasadas de dias anteriores:* ${overdueRoutine.length}`);
      overdueRoutine.slice(0, 5).forEach((t) => {
        const days = Math.floor(
          (today.getTime() - parseISO(t.scheduledDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        lines.push(`• ${t.title} (${days} dia${days > 1 ? 's' : ''} atrás)`);
      });
      if (overdueRoutine.length > 5) lines.push(`• ... + ${overdueRoutine.length - 5}`);
      lines.push('');
    }

    // --- Avulsas ---
    if (doneOther.length > 0) {
      lines.push(`*🎯 Tarefas avulsas concluídas:*`);
      doneOther.forEach((t) => lines.push(`• ${t.title}`));
      lines.push('');
    }

    // --- Metas ---
    if (doneGoals.length > 0) {
      lines.push(`*🚀 Metas batidas hoje:*`);
      doneGoals.forEach((g) => lines.push(`• ${g.title}`));
      lines.push('');
    }

    // Fechamento
    if (doneRoutine.length === 0 && doneOther.length === 0 && doneGoals.length === 0) {
      lines.push(`Dia mais tranquilo, sem muita execução hoje. Amanhã retomo.`);
    } else {
      lines.push(`Qualquer coisa me chama. 👊`);
    }

    return lines.join('\n');
  }, [doneRoutine, pendingRoutine, overdueRoutine, doneOther, doneGoals, routineByCategory, recipientName, todayStr, today]);

  // ---------- Ações ----------
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Não consegui copiar. Selecione o texto e copie manualmente.');
    }
  };

  const handleWhatsApp = () => {
    const phone = whatsappRecipient ? cleanPhone(whatsappRecipient) : '';
    const encoded = encodeURIComponent(message);
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    // Copia pro clipboard como backup (caso wa.me trunque o texto)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message).catch(() => undefined);
    }

    // Em PWA standalone mobile, window.open('_blank') abre tela preta porque
    // o PWA não tem UI de abas. Usamos <a> sintético com target="_blank" —
    // o SO detecta wa.me como deep link e abre o WhatsApp nativo.
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Fallback: navegação direta
      window.location.href = url;
    }

    // Marca que enviou hoje — o reminder não dispara de novo
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    onUpdateConfig({ lastSentDate: todayKey });
  };

  const handleImproveWithClaude = () => {
    const prompt = `Melhore essa mensagem de check-in pra minha chefe (WhatsApp). Deixe mais natural, humana e profissional, mas mantenha a estrutura e os dados. Não invente números novos. Responda só com a mensagem pronta, sem explicações.\n\n---\n\n${message}`;
    const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank');
  };

  const handleAddQuick = () => {
    const title = quickInput.trim();
    if (!title) return;
    onAddQuickDone(title);
    setQuickInput('');
  };

  const saveConfig = () => {
    const h = Math.max(0, Math.min(23, parseInt(hourInput) || 0));
    const m = Math.max(0, Math.min(59, parseInt(minuteInput) || 0));
    onUpdateConfig({
      whatsappRecipient: phoneInput.trim() || undefined,
      recipientName: nameInput.trim() || undefined,
      reminderHour: h,
      reminderMinute: m
    });
    setShowConfig(false);
  };

  // ---------- Render ----------
  const panelCls = `relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border mobile-modal-content-sheet sm:!max-h-none sm:!position-static sm:!rounded-[2.5rem] overflow-y-auto max-h-[90vh] ${
    isFem ? 'bg-white border-rose-100' : 'bg-zinc-900 border-zinc-800'
  }`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={panelCls}>
        <div className="pull-indicator sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isFem ? 'bg-rose-100' : 'bg-zinc-800'}`}>
              <MessageCircle className={`w-5 h-5 ${isFem ? 'text-rose-600' : 'text-green-500'}`} />
            </div>
            <div>
              <h3
                className={`text-base sm:text-lg font-black uppercase ${
                  isFem ? 'text-rose-700' : 'text-white'
                }`}
              >
                Check-in do Dia
              </h3>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>
                {todayStr} • pronto pra enviar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={isFem ? 'text-rose-300 hover:text-rose-700' : 'text-zinc-600 hover:text-white'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showConfig ? (
          <div className="space-y-3">
            <p className={`text-xs font-bold ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}>
              Quem recebe o check-in? (configure uma vez, depois fica automático)
            </p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Nome (ex: Bárbara)"
              className={`w-full p-3 rounded-2xl text-sm font-bold outline-none ${
                isFem
                  ? 'bg-rose-50/50 text-rose-900 border border-rose-200 focus:border-rose-400'
                  : 'bg-black text-white border border-zinc-800 focus:border-zinc-600'
              }`}
            />
            <input
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="WhatsApp com DDI (ex: +5511999999999)"
              className={`w-full p-3 rounded-2xl text-sm font-bold outline-none ${
                isFem
                  ? 'bg-rose-50/50 text-rose-900 border border-rose-200 focus:border-rose-400'
                  : 'bg-black text-white border border-zinc-800 focus:border-zinc-600'
              }`}
            />
            <p className={`text-[10px] ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>
              Ex: +5511988887777 (com DDI 55 Brasil + DDD + número)
            </p>

            <p className={`text-xs font-bold pt-2 ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}>
              Horário do lembrete automático:
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                max={23}
                value={hourInput}
                onChange={(e) => setHourInput(e.target.value)}
                className={`w-20 p-3 rounded-2xl text-sm font-bold text-center outline-none ${
                  isFem
                    ? 'bg-rose-50/50 text-rose-900 border border-rose-200 focus:border-rose-400'
                    : 'bg-black text-white border border-zinc-800 focus:border-zinc-600'
                }`}
              />
              <span className={`font-black ${isFem ? 'text-rose-600' : 'text-zinc-400'}`}>:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minuteInput}
                onChange={(e) => setMinuteInput(e.target.value)}
                className={`w-20 p-3 rounded-2xl text-sm font-bold text-center outline-none ${
                  isFem
                    ? 'bg-rose-50/50 text-rose-900 border border-rose-200 focus:border-rose-400'
                    : 'bg-black text-white border border-zinc-800 focus:border-zinc-600'
                }`}
              />
              <span className={`text-xs ${isFem ? 'text-rose-500' : 'text-zinc-500'}`}>(ex: 17 e 40)</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfig(false)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase ${
                  isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={saveConfig}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase text-white ${
                  isFem ? 'bg-rose-600' : 'bg-green-600'
                }`}
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
            {notifPerm !== 'granted' && (
              <div
                className={`rounded-2xl p-3 mb-3 flex items-center justify-between gap-3 border-2 ${
                  isFem
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-amber-900/20 border-amber-700 text-amber-200'
                }`}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">
                    {notifPerm === 'denied'
                      ? '🔕 Notificações bloqueadas'
                      : '🔔 Ativar notificação do lembrete'}
                  </p>
                  <p className="text-[10px] font-bold mt-1 opacity-80">
                    {notifPerm === 'denied'
                      ? 'Nas configs do navegador, permita notificações pra esse site.'
                      : 'Precisa permitir uma vez pro lembrete às ' + (reminderHour ?? 18) + ':' + String(reminderMinute ?? 0).padStart(2, '0') + ' tocar.'}
                  </p>
                </div>
                {notifPerm === 'default' && (
                  <button
                    onClick={requestNotif}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white active:scale-95"
                  >
                    Ativar
                  </button>
                )}
              </div>
            )}

            {/* Painel: puxar tarefas avulsas concluídas pro check-in */}
            {pickerCandidates.length > 0 && (
              <div
                className={`rounded-2xl p-3 mb-3 border-2 ${
                  isFem ? 'border-blue-200 bg-blue-50/30' : 'border-blue-800 bg-blue-950/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      isFem ? 'text-blue-700' : 'text-blue-300'
                    }`}
                  >
                    📋 Tem {pickerCandidates.length} tarefa{pickerCandidates.length > 1 ? 's' : ''} conclu{pickerCandidates.length > 1 ? 'ídas' : 'ída'} no Checklist. Marca as que foram hoje:
                  </p>
                  {!showPicker && (
                    <button
                      onClick={() => setShowPicker(true)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        isFem ? 'bg-blue-600 text-white' : 'bg-blue-700 text-white'
                      }`}
                    >
                      Selecionar
                    </button>
                  )}
                </div>
                {showPicker && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={pickAll}
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          isFem ? 'text-blue-700 hover:text-blue-900' : 'text-blue-300 hover:text-blue-100'
                        }`}
                      >
                        ☑ Marcar todas
                      </button>
                      <span className={`text-[10px] ${isFem ? 'text-blue-600' : 'text-blue-400'}`}>
                        {pickedIds.size}/{pickerCandidates.length} selec.
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {pickerCandidates.map((task) => (
                        <label
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer ${
                            pickedIds.has(task.id)
                              ? isFem
                                ? 'bg-blue-100'
                                : 'bg-blue-900/50'
                              : isFem
                                ? 'bg-white hover:bg-blue-50'
                                : 'bg-zinc-900 hover:bg-zinc-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={pickedIds.has(task.id)}
                            onChange={() => togglePick(task.id)}
                            className="accent-blue-600"
                          />
                          <span className={`text-xs font-bold flex-1 ${isFem ? 'text-zinc-900' : 'text-zinc-200'}`}>
                            {task.title}
                          </span>
                          {task.category && (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isFem ? 'bg-blue-200 text-blue-800' : 'bg-blue-900/60 text-blue-300'
                              }`}
                            >
                              {task.category}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setShowPicker(false); setPickedIds(new Set()); }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmPicker}
                        disabled={pickedIds.size === 0}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40 ${
                          isFem ? 'bg-blue-600' : 'bg-blue-700'
                        }`}
                      >
                        Adicionar à mensagem ({pickedIds.size})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input rápido pra adicionar algo avulso direto na mensagem */}
            <div
              className={`rounded-2xl p-3 mb-3 border-2 border-dashed ${
                isFem ? 'border-rose-200 bg-rose-50/20' : 'border-zinc-700 bg-zinc-950/50'
              }`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-wider mb-2 ${
                  isFem ? 'text-rose-600' : 'text-zinc-400'
                }`}
              >
                ➕ Fez algo a mais hoje? Adiciona:
              </p>
              <div className="flex gap-2">
                <input
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuick()}
                  placeholder="Ex: Resolvi problema do fornecedor X"
                  className={`flex-1 p-3 rounded-xl text-sm font-bold outline-none ${
                    isFem
                      ? 'bg-white text-zinc-900 border border-rose-200 focus:border-rose-400'
                      : 'bg-black text-zinc-100 border border-zinc-800 focus:border-zinc-600'
                  }`}
                />
                <button
                  onClick={handleAddQuick}
                  disabled={!quickInput.trim()}
                  className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${
                    isFem ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  + Add
                </button>
              </div>
              <p className={`text-[9px] mt-2 ${isFem ? 'text-rose-400' : 'text-zinc-500'}`}>
                Aparece na mensagem e fica salvo como tarefa concluída.
              </p>
            </div>

            <div
              className={`rounded-2xl p-4 sm:p-5 mb-4 font-mono text-[12px] sm:text-sm whitespace-pre-wrap leading-relaxed ${
                isFem
                  ? 'bg-rose-50/30 border border-rose-100 text-zinc-900'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-200'
              }`}
            >
              {message}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-green-600 hover:bg-green-500 active:scale-95 transition-all shadow-lg shadow-green-500/30"
              >
                <Send className="w-4 h-4" /> Enviar no WhatsApp
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all ${
                  isFem ? 'bg-rose-100 text-rose-700' : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={handleImproveWithClaude}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                  isFem ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Polir com Claude (grátis, usa seu Pro)
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                  isFem ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {whatsappRecipient ? 'Editar destinatário' : '+ Config destinatário'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
