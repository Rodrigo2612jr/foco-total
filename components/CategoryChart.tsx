
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Target } from 'lucide-react';
import { Goal, Category } from '../types';

interface Props {
  tasks: Goal[];
}

export const CategoryChart: React.FC<Props> = ({ tasks }) => {
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640;
  const data = React.useMemo(() => {
    const counts: Record<Category, number> = {
      'Trabalho': 0,
      'Pessoal': 0,
      'Saúde': 0,
      'Estudos': 0,
      'Outros': 0
    };
    
    tasks.forEach(t => {
      if (t.category && counts[t.category] !== undefined) {
        counts[t.category]++;
      } else if (!t.category) {
        counts['Outros']++;
      }
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const COLORS = ['#2563eb', '#10b981', '#06b6d4', '#8b5cf6', '#71717a'];

  return (
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-sm p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 h-[350px] sm:h-[450px] shadow-2xl flex flex-col">
      <h3 className="text-[9px] sm:text-[11px] font-black dark:text-zinc-100 text-zinc-800 mb-6 sm:mb-10 uppercase tracking-[0.3em] italic text-center sm:text-left">ALOCAÇÃO</h3>
      <div className="flex-1 w-full flex items-center justify-center">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={isSmall ? 50 : 70}
                outerRadius={isSmall ? 75 : 100}
                paddingAngle={8}
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#09090b', 
                  border: '1px solid #27272a', 
                  borderRadius: '0.75rem',
                  padding: '0.75rem' 
                }}
                itemStyle={{ color: '#ffffff', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}
              />
              <Legend 
                verticalAlign="bottom" 
                align="center"
                height={40} 
                formatter={(value) => <span className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1 sm:px-2">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center opacity-10">
            <Target className="w-12 h-12 sm:w-20 sm:h-20 mb-4" />
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Sem Dados</p>
          </div>
        )}
      </div>
    </div>
  );
};
