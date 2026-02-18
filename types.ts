
export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

export type Category = 'Trabalho' | 'Pessoal' | 'Saúde' | 'Estudos' | 'Outros';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string; // ISO format
  priority: Priority;
  category: Category;
  isDaily?: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string; // ISO format
  createdAt: string;
  category?: Category;
  isDaily?: boolean;
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
