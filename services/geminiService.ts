
import { GoogleGenAI } from "@google/genai";
import { Task } from "../types";

export const getProductivityInsight = async (tasks: Task[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const taskList = tasks.map(t => `- ${t.title} (${t.completed ? 'Concluída' : 'Pendente'})`).join('\n');

  const prompt = `
    Analise a produtividade do usuário com base nestas tarefas de hoje:
    Total: ${totalCount}
    Concluídas: ${completedCount}
    
    Lista de tarefas:
    ${taskList}

    Dê um conselho curto, profissional e motivador (máximo 2 frases) em português sobre como ele pode melhorar ou elogie o bom desempenho.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
      },
    });
    return response.text || "Continue focado em seus objetivos!";
  } catch (error) {
    console.error("Erro ao buscar insights da IA:", error);
    return "Mantenha a disciplina para alcançar suas metas.";
  }
};
