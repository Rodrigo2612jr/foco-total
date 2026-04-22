import React, { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Task, ThemeType } from '../types';

interface Props {
  theme: ThemeType;
  tasks: Task[];
  goals: { id: string; title: string; completed: boolean; date: string; category?: string }[];
  whatsappRecipient?: string; // telefone com ou sem + (ex: "+5511999999999" ou "11999999999")
  recipientName?: string; // primeiro nome (ex: "Bárbara")
  onClose: () => void;
  onUpdateConfig: (config: { whatsappRecipient?: string; recipientName?: string }) => void;
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
  onClose,
  onUpdateConfig
}) => {
  const isFem = theme === 'feminine';
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [phoneInput, setPhoneInput] = useState(whatsappRecipient ?? '');
  const [nameInput, setNameInput] = useState(recipientName ?? '');

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
    const avulsasToday = todayTasks.filter((t) => !t.recurringTaskId);

    const overdue = tasks.filter(
      (t) =>
        t.recurringTaskId &&
        !t.completed &&
        !isSameDay(parseISO(t.scheduledDate), target) &&
        parseISO(t.scheduledDate) < target
    );

    const doneRoutine = routineToday.filter((t) => t.completed);
    const pendingRoutine = routineToday.filter((t) => !t.completed);
    const doneOther = avulsasToday.filter((t) => t.completed);

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
    window.open(url, '_blank');
  };

  const handleImproveWithClaude = () => {
    const prompt = `Melhore essa mensagem de check-in pra minha chefe (WhatsApp). Deixe mais natural, humana e profissional, mas mantenha a estrutura e os dados. Não invente números novos. Responda só com a mensagem pronta, sem explicações.\n\n---\n\n${message}`;
    const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank');
  };

  const saveConfig = () => {
    onUpdateConfig({
      whatsappRecipient: phoneInput.trim() || undefined,
      recipientName: nameInput.trim() || undefined
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
