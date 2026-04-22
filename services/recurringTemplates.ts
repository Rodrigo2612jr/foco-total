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
  name: 'Rotina Pascoto',
  description:
    'Rotina completa do negócio: diárias (financeiro, marketing, e-commerce, check-in), semanais e mensais (fechamento, folha, clube de fidelidade, automação).',
  categories: [
    { name: 'Financeiro', color: '#059669' },     // esmeralda
    { name: 'Marketing', color: '#DB2777' },      // rosa
    { name: 'E-commerce', color: '#2563EB' },     // azul
    { name: 'Administrativo', color: '#7C3AED' }, // roxo
    { name: 'Clube de Fidelidade', color: '#F59E0B' }, // âmbar
    { name: 'Automação', color: '#0891B2' },      // ciano
    { name: 'Rotina', color: '#475569' }          // cinza ardósia
  ],
  recurrings: [
    // ---------- 🟢 DIÁRIAS ----------
    { title: 'Pagar boletos do dia', categoryName: 'Financeiro', frequency: 'daily', active: true },
    { title: 'Analisar e-mails do financeiro (contabilidade / impostos)', categoryName: 'Financeiro', frequency: 'daily', active: true },
    { title: 'Monitorar anúncios (site + loja) — performance e ROI', categoryName: 'Marketing', frequency: 'daily', active: true },
    { title: 'Acompanhar Grupo VIP (conversões e engajamento)', categoryName: 'Marketing', frequency: 'daily', active: true },
    { title: 'Checar site (pedidos, estoque, funcionamento)', categoryName: 'E-commerce', frequency: 'daily', active: true },
    { title: 'Check-in matinal: enviar plano do dia no WhatsApp', categoryName: 'Rotina', frequency: 'daily', active: true },

    // ---------- 🟡 SEMANAIS ----------
    { title: 'Criar promoção da semana', categoryName: 'Marketing', frequency: 'weekly', dayOfWeek: 1, active: true }, // segunda
    { title: 'Reunião semanal de alinhamento', categoryName: 'Rotina', frequency: 'weekly', dayOfWeek: 1, active: true }, // segunda
    { title: 'Análise de performance dos anúncios da semana', categoryName: 'Marketing', frequency: 'weekly', dayOfWeek: 5, active: true }, // sexta
    { title: 'Revisar métricas de venda do site da semana', categoryName: 'E-commerce', frequency: 'weekly', dayOfWeek: 5, active: true }, // sexta

    // ---------- 🔵 MENSAIS ----------
    { title: 'Organizar caixinhas da Loja 1 e Loja 2', categoryName: 'Administrativo', frequency: 'monthly', dayOfMonth: 1, active: true },
    { title: 'Arquivar notas lançadas e boletos pagos (envelope/pasta)', categoryName: 'Administrativo', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'Recolher assinaturas dos funcionários (pagamentos do mês)', categoryName: 'Administrativo', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'Fechar e analisar DRE do mês', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'Pagamento de salários', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'Pagamento de adiantamentos', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 20, active: true },
    { title: 'Pagar contas fixas (internet, água, luz)', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 10, active: true },
    { title: 'Revisar crescimento da base e engajamento do Clube', categoryName: 'Clube de Fidelidade', frequency: 'monthly', dayOfMonth: 28, active: true },
    { title: 'Revisar processos candidatos a automação no próximo mês', categoryName: 'Automação', frequency: 'monthly', dayOfMonth: 28, active: true }
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

  const existingKey = (r: { title: string; frequency: string; dayOfWeek?: number; dayOfMonth?: number }) =>
    `${r.title.trim().toLowerCase()}|${r.frequency}|${r.dayOfWeek ?? ''}|${r.dayOfMonth ?? ''}`;

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
      dayOfMonth: tplRec.dayOfMonth,
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
