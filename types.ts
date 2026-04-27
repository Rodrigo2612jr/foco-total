export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

// Categorias agora são dinâmicas (por usuário). Mantemos o tipo como string
// para compatibilidade com dados antigos (Trabalho, Pessoal, Saúde, Estudos, Outros).
export type Category = string;

// Frequência de uma tarefa recorrente.
// - daily: todo dia (pode excluir dias específicos via excludedDaysOfWeek)
// - weekly: em um/mais dias específicos da semana (0=Dom ... 6=Sáb)
// - biweekly: a cada 2 semanas, num dia específico (segunda alternada, p.ex.)
// - monthly: em um dia específico do mês (1..31; se o mês não tiver, cai no último dia)
export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface CategoryDef {
  id: string;
  name: string;
  color: string;  // hex ex: '#E11D48'
  icon?: string;  // nome do ícone lucide (opcional)
  createdAt: string;
}

export interface RecurringTask {
  id: string;
  title: string;
  categoryId?: string;      // link para CategoryDef.id (preferencial)
  category?: string;        // fallback: nome de categoria (compatibilidade)
  frequency: Frequency;
  dayOfWeek?: number;       // [legado] único dia — 0..6
  daysOfWeek?: number[];    // múltiplos dias — 0..6 (ex: [1,3,5] = seg/qua/sex)
  dayOfMonth?: number;      // 1..31 — usado quando frequency === 'monthly'
  // Para biweekly: dia da semana (1=seg) + data de referência (a recorrente
  // toca a cada 14 dias contados a partir da referência). Se não houver
  // referência, usa a primeira ocorrência do dia da semana após createdAt.
  referenceDate?: string;   // ISO date — quando o ciclo de 14d começa
  // Dias da semana onde a recorrente NÃO toca (mesmo se diária ou weekly bate).
  // Ex: F1 financeira com excludedDaysOfWeek: [0, 6] = não toca dom nem sáb.
  excludedDaysOfWeek?: number[];
  active: boolean;          // false = pausada (não gera mais instâncias futuras)
  createdAt: string;
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string; // ISO format
  priority: Priority;
  category: Category;
  isDaily?: boolean;         // legado — migrado para RecurringTask (daily)
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string;    // ISO format
  createdAt: string;
  completedAt?: string;      // ISO — setado quando completed vira true; removido quando desmarca
  category?: Category;
  isDaily?: boolean;         // legado — migrado para RecurringTask (daily)
  recurringTaskId?: string;  // link para RecurringTask.id (instância gerada automaticamente)
}

export interface WeeklyStat {
  day: string;
  completed: number;
  total: number;
}

export type ThemeType = 'masculine' | 'feminine';

export interface User {
  username: string;
  name: string;
  theme: ThemeType;
}

// Log de geração por dia — evita duplicar quando o app é aberto várias vezes.
// dateKey = 'yyyy-MM-dd'. Valor = array de RecurringTask.id já gerados nesse dia.
export type RecurringGenerationLog = Record<string, string[]>;

// Configurações do check-in diário (envio pra chefe via WhatsApp).
export interface CheckinConfig {
  whatsappRecipient?: string; // telefone com DDI (ex: '+5511988887777')
  recipientName?: string;     // primeiro nome (ex: 'Camila')
  reminderHour?: number;      // hora do dia que destaca o botão (0-23, default: 18)
  reminderMinute?: number;    // minuto do reminder (0-59, default: 0)
  lastSentDate?: string;      // 'yyyy-MM-dd' — pra evitar lembrar 2x no mesmo dia
  // Subscription pra Web Push (funciona com app fechado).
  // Estrutura serializada que o backend usa pra mandar push.
  pushSubscription?: {
    endpoint: string;
    expirationTime: number | null;
    keys: { p256dh: string; auth: string };
  };
}
