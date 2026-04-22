export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

// Categorias agora são dinâmicas (por usuário). Mantemos o tipo como string
// para compatibilidade com dados antigos (Trabalho, Pessoal, Saúde, Estudos, Outros).
export type Category = string;

// Frequência de uma tarefa recorrente.
// - daily: todo dia
// - weekly: em um dia específico da semana (0=Dom ... 6=Sáb)
// - monthly: em um dia específico do mês (1..31; se o mês não tiver, cai no último dia)
export type Frequency = 'daily' | 'weekly' | 'monthly';

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
  recipientName?: string;     // primeiro nome (ex: 'Bárbara')
  reminderHour?: number;      // hora do dia que destaca o botão (default: 18)
  lastSentDate?: string;      // 'yyyy-MM-dd' — pra evitar lembrar 2x no mesmo dia
}
