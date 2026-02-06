
import React from 'react';
import { CheckCircle, Clock, Target, TrendingUp } from 'lucide-react';
import { ThemeType } from '../types';

interface Props {
  total: number;
  completed: number;
  pending: number;
  rate: string;
  theme?: ThemeType;
}

export const DashboardHeader: React.FC<Props> = ({ total, completed, pending, rate, theme = 'feminine' }) => {
  const isFem = theme === 'feminine';
  const cardBase = isFem 
    ? "bg-white border-rose-200 shadow-2xl shadow-rose-200/20" 
    : "bg-zinc-950 border-zinc-800 shadow-2xl shadow-black/80";
  const labelText = isFem ? "text-rose-400" : "text-zinc-600";
  const valueText = isFem ? "text-rose-950" : "text-zinc-50";
  const iconBg = isFem ? "bg-rose-100" : "bg-black";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-10">
      <div className={`${cardBase} p-10 rounded-[3rem] border relative group overflow-hidden`}>
        <div className={`absolute -right-4 -top-4 ${isFem ? 'bg-rose-500/5' : 'bg-blue-500/5'} w-24 h-24 rounded-full blur-3xl group-hover:opacity-100 transition-all`}></div>
        <div className="flex items-center justify-between mb-8">
          <span className={`${labelText} text-[10px] font-black uppercase tracking-[0.3em]`}>Mapeado</span>
          <div className={`p-2.5 ${iconBg} rounded-2xl`}>
             <Target className={`${isFem ? 'text-rose-600' : 'text-blue-600'} w-5 h-5`} />
          </div>
        </div>
        <div className={`text-6xl font-black ${valueText} italic tracking-tighter leading-none`}>{total}</div>
        <p className={`${labelText} text-[10px] font-black uppercase mt-5 tracking-widest`}>Objetivos</p>
      </div>
      
      <div className={`${cardBase} p-10 rounded-[3rem] border relative group overflow-hidden`}>
        <div className={`absolute -right-4 -top-4 ${isFem ? 'bg-emerald-500/5' : 'bg-emerald-500/5'} w-24 h-24 rounded-full blur-3xl group-hover:opacity-100 transition-all`}></div>
        <div className="flex items-center justify-between mb-8">
          <span className={`${labelText} text-[10px] font-black uppercase tracking-[0.3em]`}>Sucesso</span>
          <div className={`p-2.5 ${isFem ? 'bg-emerald-100/50' : 'bg-black'} rounded-2xl`}>
             <CheckCircle className="text-emerald-500 w-5 h-5" />
          </div>
        </div>
        <div className={`text-6xl font-black ${valueText} italic tracking-tighter leading-none`}>{completed}</div>
        <p className="text-[10px] font-black uppercase text-emerald-500 mt-5 tracking-widest">Executados</p>
      </div>

      <div className={`${cardBase} p-10 rounded-[3rem] border relative group overflow-hidden`}>
        <div className={`absolute -right-4 -top-4 ${isFem ? 'bg-rose-500/5' : 'bg-orange-500/5'} w-24 h-24 rounded-full blur-3xl group-hover:opacity-100 transition-all`}></div>
        <div className="flex items-center justify-between mb-8">
          <span className={`${labelText} text-[10px] font-black uppercase tracking-[0.3em]`}>Ação</span>
          <div className={`p-2.5 ${iconBg} rounded-2xl`}>
             <Clock className={`${isFem ? 'text-rose-600' : 'text-orange-600'} w-5 h-5`} />
          </div>
        </div>
        <div className={`text-6xl font-black ${valueText} italic tracking-tighter leading-none`}>{pending}</div>
        <p className={`${isFem ? 'text-rose-600' : 'text-orange-600'} text-[10px] font-black uppercase mt-5 tracking-widest`}>Pendentes</p>
      </div>

      <div className={`${cardBase} p-10 rounded-[3rem] border relative group overflow-hidden`}>
        <div className={`absolute -right-4 -top-4 ${isFem ? 'bg-purple-500/5' : 'bg-purple-500/5'} w-24 h-24 rounded-full blur-3xl group-hover:opacity-100 transition-all`}></div>
        <div className="flex items-center justify-between mb-8">
          <span className={`${labelText} text-[10px] font-black uppercase tracking-[0.3em]`}>Eficiência</span>
          <div className={`p-2.5 ${isFem ? 'bg-purple-100/50' : 'bg-black'} rounded-2xl`}>
             <TrendingUp className="text-purple-500 w-5 h-5" />
          </div>
        </div>
        <div className={`text-6xl font-black ${valueText} italic tracking-tighter leading-none`}>{rate}<span className="text-2xl ml-1">%</span></div>
        <p className="text-[10px] font-black uppercase text-purple-500 mt-5 tracking-widest">Taxa de Foco</p>
      </div>
    </div>
  );
};
