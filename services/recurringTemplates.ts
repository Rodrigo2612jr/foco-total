import { CategoryDef, RecurringTask } from '../types';

// Template "Rotina Pascoto" — categorias e recorrentes pré-definidas
// com a rotina completa do negócio (diárias, semanais, mensais).
// Usuário pode importar via botão "Importar rotina" na tela /rotina.
// Não é seed global: só roda quando o usuário clica.

export interface RecurringTemplate {
  id: string;
  name: string;
  description: string;
  categories: Omit<CategoryDef, 'id' | 'createdAt'>[];
  // recurrings referenciam categorias pelo NOME dela (resolvido no momento do import)
  recurrings: Omit<RecurringTask, 'id' | 'createdAt' | 'categoryId'> & {
    categoryName: string;
  } extends infer T
    ? (T & { categoryName: string })[]
    : never;
}

type TemplateRecurring = Omit<RecurringTask, 'id' | 'createdAt' | 'categoryId'> & {
  categoryName: string;
};

export interface Template {
  id: string;
  name: string;
  description: string;
  categories: Omit<CategoryDef, 'id' | 'createdAt'>[];
  recurrings: TemplateRecurring[];
}

export const PASCOTO_TEMPLATE: Template = {
  id: 'pascoto-routine',
  name: 'Rotina Pascoto v2',
  description:
    'Operacional diário (sem domingo, sem financeiro no sábado) + sprints estratégicos quinzenais na segunda + degustação de sábado planejada na quarta. Todas as frentes recebem atenção sustentável.',
  categories: [
    { name: 'Administrativo/RH', color: '#7C3AED' },
    { name: 'Financeiro', color: '#059669' },
    { name: 'E-commerce/Site', color: '#2563EB' },
    { name: 'Marketing', color: '#DB2777' },
    { name: 'Clube de Fidelidade', color: '#F59E0B' },
    { name: 'Automação', color: '#0891B2' },
    { name: 'Rituais', color: '#475569' }
  ],
  recurrings: [
    // ---------- 🟢 DIÁRIAS (não rodam domingo; financeiras também não rodam sábado) ----------
    // (Check-in matinal removido — você manda o resumo só no fim do dia via /checkin)
    { title: 'F1 — Pagar boletos do dia', categoryName: 'Financeiro', frequency: 'daily', excludedDaysOfWeek: [0, 6], active: true },
    { title: 'F2 — Analisar e-mails do financeiro + lançar impostos (contabilidade)', categoryName: 'Financeiro', frequency: 'daily', excludedDaysOfWeek: [0, 6], active: true },
    { title: 'Monitorar anúncios do site (ROI)', categoryName: 'Marketing', frequency: 'daily', excludedDaysOfWeek: [0], active: true },
    { title: 'Monitorar anúncios da loja física', categoryName: 'Marketing', frequency: 'daily', excludedDaysOfWeek: [0], active: true },
    { title: 'Acompanhar Grupo VIP (conversões e engajamento)', categoryName: 'Marketing', frequency: 'daily', excludedDaysOfWeek: [0], active: true },
    { title: 'Checar site — pedidos, estoque, funcionamento', categoryName: 'E-commerce/Site', frequency: 'daily', excludedDaysOfWeek: [0], active: true },

    // ---------- 🟣 QUINZENAIS — Sprints Estratégicos (segunda alternada) ----------
    // referenceDate ancora o ciclo na segunda 27/abril/2026. A cada 14 dias, toca de novo.
    { title: '🎯 Sprint Marketing — análise + criar anúncios + ideias VIP', categoryName: 'Marketing', frequency: 'biweekly', dayOfWeek: 1, referenceDate: '2026-04-27', active: true },
    { title: '🎯 Sprint Clube de Fidelidade — análise + ideias engajamento e recompra', categoryName: 'Clube de Fidelidade', frequency: 'biweekly', dayOfWeek: 1, referenceDate: '2026-04-27', active: true },
    { title: '🎯 Sprint Grupo VIP — calendário de promo + conteúdo da quinzena', categoryName: 'Marketing', frequency: 'biweekly', dayOfWeek: 1, referenceDate: '2026-04-27', active: true },
    { title: '🎯 Sprint Site — análise + ideias pra escalar vendas', categoryName: 'E-commerce/Site', frequency: 'biweekly', dayOfWeek: 1, referenceDate: '2026-04-27', active: true },

    // ---------- 🟡 SEMANAIS ----------
    { title: 'R2 — Reunião semanal de alinhamento (15-20 min)', categoryName: 'Rituais', frequency: 'weekly', daysOfWeek: [2], active: true },
    { title: '🥄 Planejar Degustação de Sábado — escolher produto + negociar fornecedor', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [3], active: true },
    { title: 'Criar promoção da próxima semana (encarte)', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [5], active: true },
    { title: 'Análise de performance dos anúncios da semana', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [5], active: true },
    { title: 'Revisar métricas de venda do site da semana (M5)', categoryName: 'E-commerce/Site', frequency: 'weekly', daysOfWeek: [5], active: true },
    { title: '⭐ Degustação na loja', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [6], active: true },

    // ---------- 🔵 MENSAIS (operacionais — sem C1/C2/P4 que vão pra sprints quinzenais) ----------
    { title: 'A3 — Organizar caixinhas da Loja 1 e Loja 2', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 1, active: true },
    { title: 'F4 — Fechar e analisar DRE do mês', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'A3 — Arquivar notas lançadas e boletos pagos (envelope/pasta)', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'A2 — Organizar pasta de dados dos funcionários', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'A1 — Recolher assinaturas dos funcionários (salário)', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'Pagamento de salários', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 5, active: true, notes: 'Ajustar manualmente se quinto dia útil for diferente.' },
    { title: 'F3 — Pagar contas fixas (internet, água, luz)', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 10, active: true },
    { title: 'A1 — Recolher assinaturas dos funcionários (adiantamento)', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 20, active: true },
    { title: 'Pagamento de adiantamentos', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 20, active: true }
  ]
};

export const AVAILABLE_TEMPLATES: Template[] = [PASCOTO_TEMPLATE];

// Aplica um template no usuário. Faz merge: não duplica categorias com mesmo nome
// nem recorrentes com título+frequência já existentes.
export const applyTemplate = (params: {
  template: Template;
  existingCategories: CategoryDef[];
  existingRecurrings: RecurringTask[];
}): {
  mergedCategories: CategoryDef[];
  mergedRecurrings: RecurringTask[];
  addedCategories: number;
  addedRecurrings: number;
} => {
  const { template, existingCategories, existingRecurrings } = params;

  const catNameToDef = new Map<string, CategoryDef>(
    existingCategories.map((c) => [c.name.toLowerCase(), c])
  );
  const addedCats: CategoryDef[] = [];

  template.categories.forEach((tplCat) => {
    const key = tplCat.name.toLowerCase();
    if (!catNameToDef.has(key)) {
      const newCat: CategoryDef = {
        id: crypto.randomUUID(),
        name: tplCat.name,
        color: tplCat.color,
        icon: tplCat.icon,
        createdAt: new Date().toISOString()
      };
      catNameToDef.set(key, newCat);
      addedCats.push(newCat);
    }
  });

  const existingKey = (r: {
    title: string;
    frequency: string;
    dayOfWeek?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }) => {
    const daysKey = Array.isArray(r.daysOfWeek) && r.daysOfWeek.length > 0
      ? r.daysOfWeek.slice().sort((a, b) => a - b).join(',')
      : (r.dayOfWeek ?? '');
    return `${r.title.trim().toLowerCase()}|${r.frequency}|${daysKey}|${r.dayOfMonth ?? ''}`;
  };

  const existingRecSet = new Set(existingRecurrings.map(existingKey));
  const addedRecs: RecurringTask[] = [];

  template.recurrings.forEach((tplRec) => {
    const key = existingKey(tplRec);
    if (existingRecSet.has(key)) return;

    const cat = catNameToDef.get(tplRec.categoryName.toLowerCase());
    const newRec: RecurringTask = {
      id: crypto.randomUUID(),
      title: tplRec.title,
      categoryId: cat?.id,
      category: cat?.name ?? tplRec.categoryName,
      frequency: tplRec.frequency,
      dayOfWeek: tplRec.dayOfWeek,
      daysOfWeek: tplRec.daysOfWeek,
      dayOfMonth: tplRec.dayOfMonth,
      referenceDate: tplRec.referenceDate,
      excludedDaysOfWeek: tplRec.excludedDaysOfWeek,
      active: tplRec.active,
      createdAt: new Date().toISOString(),
      notes: tplRec.notes
    };
    addedRecs.push(newRec);
    existingRecSet.add(key);
  });

  return {
    mergedCategories: [...existingCategories, ...addedCats],
    mergedRecurrings: [...existingRecurrings, ...addedRecs],
    addedCategories: addedCats.length,
    addedRecurrings: addedRecs.length
  };
};
