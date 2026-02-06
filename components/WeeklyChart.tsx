
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WeeklyStat } from '../types';

interface Props {
  data: WeeklyStat[];
  title?: string;
}

export const WeeklyChart: React.FC<Props> = ({ data, title = "ANÁLISE SEMANAL" }) => {
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-sm p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 h-[350px] sm:h-[450px] shadow-2xl flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-10 gap-2">
        <h3 className="text-[9px] sm:text-[11px] font-black dark:text-zinc-100 text-zinc-800 uppercase tracking-[0.3em] italic">{title}</h3>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_5px_rgba(37,99,235,1)]"></div>
           <span className="text-[7px] sm:text-[8px] font-black uppercase text-zinc-500 tracking-widest">Conclusão</span>
        </div>
      </div>
      <div className="flex-1 w-full text-[8px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.05)" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 8, fontWeight: 900 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 8, fontWeight: 900 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(37,99,235,0.05)' }}
              contentStyle={{ 
                backgroundColor: '#09090b', 
                borderRadius: '0.75rem', 
                border: '1px solid #27272a',
                padding: '0.75rem',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)' 
              }}
              labelStyle={{ color: '#ffffff', fontWeight: 900, marginBottom: '4px', fontSize: '10px', fontStyle: 'italic', textTransform: 'uppercase' }}
              itemStyle={{ color: '#3b82f6', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}
            />
            <Bar dataKey="completed" radius={[3, 3, 0, 0]} barSize={isSmall ? 20 : 35}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.completed > 0 ? '#2563eb' : '#3f3f46'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
