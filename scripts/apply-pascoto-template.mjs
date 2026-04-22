// Script one-shot: aplica a rotina "Rotina Pascoto" direto no doc `users/pascoto`
// do Firestore. Faz MERGE — não apaga dados existentes, só adiciona categorias
// e recorrentes que ainda não estão lá.
//
// Uso:
//   node scripts/apply-pascoto-template.mjs
//
// Requer apenas as deps do projeto (firebase). Não precisa Firebase Admin SDK.

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { randomUUID } from 'node:crypto';

// Mesmas credenciais de services/firebase.ts (client config)
const firebaseConfig = {
  apiKey: 'AIzaSyAsBPgsRCnUOKfi_g6nY_4NAa60maKS_9s',
  authDomain: 'foco-total-5d7bd.firebaseapp.com',
  projectId: 'foco-total-5d7bd',
  storageBucket: 'foco-total-5d7bd.firebasestorage.app',
  messagingSenderId: '525962296758',
  appId: '1:525962296758:web:92a7ee365f63b7c2ca1517',
  measurementId: 'G-NZHXSY5Q92'
};

const USERNAME = 'pascoto';

// ---------- Template "Rotina Pascoto" (espelha services/recurringTemplates.ts) ----------
const TEMPLATE = {
  id: 'pascoto-routine',
  name: 'Rotina Pascoto',
  description:
    'Rotina completa baseada na Proposta de Reorganização (6 frentes + rituais).',
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
    // DIÁRIAS
    { title: 'Check-in matinal — enviar plano do dia no WhatsApp', categoryName: 'Rituais', frequency: 'daily', active: true },
    { title: 'F1 — Pagar boletos do dia', categoryName: 'Financeiro', frequency: 'daily', active: true },
    { title: 'F2 — Analisar e-mails do financeiro + lançar impostos (contabilidade)', categoryName: 'Financeiro', frequency: 'daily', active: true },
    { title: 'Monitorar anúncios do site (ROI)', categoryName: 'Marketing', frequency: 'daily', active: true },
    { title: 'Monitorar anúncios da loja física', categoryName: 'Marketing', frequency: 'daily', active: true },
    { title: 'Acompanhar Grupo VIP (conversões e engajamento)', categoryName: 'Marketing', frequency: 'daily', active: true },
    { title: 'Checar site — pedidos, estoque, funcionamento', categoryName: 'E-commerce/Site', frequency: 'daily', active: true },

    // SEMANAIS
    { title: 'R2 — Reunião semanal de alinhamento (15-20 min)', categoryName: 'Rituais', frequency: 'weekly', daysOfWeek: [2], active: true },
    { title: 'Criar promoção da próxima semana (encarte)', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [5], active: true },
    { title: 'Análise de performance dos anúncios da semana', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [5], active: true },
    { title: 'Revisar métricas de venda do site da semana (M5)', categoryName: 'E-commerce/Site', frequency: 'weekly', daysOfWeek: [5], active: true },

    // MENSAIS
    { title: 'A3 — Organizar caixinhas da Loja 1 e Loja 2', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 1, active: true },
    { title: 'F4 — Fechar e analisar DRE do mês', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'A3 — Arquivar notas lançadas e boletos pagos (envelope/pasta)', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'A2 — Organizar pasta de dados dos funcionários', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'A1 — Recolher assinaturas dos funcionários (salário)', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 5, active: true },
    { title: 'Pagamento de salários', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 5, active: true, notes: 'Ajustar manualmente se quinto dia útil for diferente.' },
    { title: 'F3 — Pagar contas fixas (internet, água, luz)', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 10, active: true },
    { title: 'A1 — Recolher assinaturas dos funcionários (adiantamento)', categoryName: 'Administrativo/RH', frequency: 'monthly', dayOfMonth: 20, active: true },
    { title: 'Pagamento de adiantamentos', categoryName: 'Financeiro', frequency: 'monthly', dayOfMonth: 20, active: true },
    { title: 'C1 — Revisar crescimento da base do Clube', categoryName: 'Clube de Fidelidade', frequency: 'monthly', dayOfMonth: 28, active: true },
    { title: 'C2 — Planejar ações de engajamento/retenção do Clube', categoryName: 'Clube de Fidelidade', frequency: 'monthly', dayOfMonth: 28, active: true },
    { title: 'P4 — Revisar processos candidatos a automação no próximo mês', categoryName: 'Automação', frequency: 'monthly', dayOfMonth: 28, active: true }
  ]
};

// ---------- Lógica de merge (idêntica à de services/recurringTemplates.ts::applyTemplate) ----------
function applyTemplate({ template, existingCategories, existingRecurrings }) {
  const catNameToDef = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  const addedCats = [];

  template.categories.forEach((tplCat) => {
    const key = tplCat.name.toLowerCase();
    if (!catNameToDef.has(key)) {
      const newCat = {
        id: randomUUID(),
        name: tplCat.name,
        color: tplCat.color,
        createdAt: new Date().toISOString()
      };
      catNameToDef.set(key, newCat);
      addedCats.push(newCat);
    }
  });

  const existingKey = (r) => {
    const daysKey = Array.isArray(r.daysOfWeek) && r.daysOfWeek.length > 0
      ? r.daysOfWeek.slice().sort((a, b) => a - b).join(',')
      : (r.dayOfWeek ?? '');
    return `${r.title.trim().toLowerCase()}|${r.frequency}|${daysKey}|${r.dayOfMonth ?? ''}`;
  };

  const existingRecSet = new Set(existingRecurrings.map(existingKey));
  const addedRecs = [];

  template.recurrings.forEach((tplRec) => {
    const key = existingKey(tplRec);
    if (existingRecSet.has(key)) return;
    const cat = catNameToDef.get(tplRec.categoryName.toLowerCase());
    const newRec = {
      id: randomUUID(),
      title: tplRec.title,
      categoryId: cat?.id,
      category: cat?.name ?? tplRec.categoryName,
      frequency: tplRec.frequency,
      dayOfWeek: tplRec.dayOfWeek,
      daysOfWeek: tplRec.daysOfWeek,
      dayOfMonth: tplRec.dayOfMonth,
      active: tplRec.active,
      createdAt: new Date().toISOString(),
      notes: tplRec.notes
    };
    // Firestore não aceita undefined — remove campos vazios
    Object.keys(newRec).forEach((k) => newRec[k] === undefined && delete newRec[k]);
    addedRecs.push(newRec);
    existingRecSet.add(key);
  });

  return {
    mergedCategories: [...existingCategories, ...addedCats],
    mergedRecurrings: [...existingRecurrings, ...addedRecs],
    addedCategories: addedCats.length,
    addedRecurrings: addedRecs.length
  };
}

// ---------- Execução ----------
async function run() {
  console.log(`🔥 Conectando ao Firestore (${firebaseConfig.projectId})...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const ref = doc(db, 'users', USERNAME);
  console.log(`📖 Lendo users/${USERNAME}...`);
  const snap = await getDoc(ref);

  const current = snap.exists() ? snap.data() : {};
  const existingCategories = Array.isArray(current.categories) ? current.categories : [];
  const existingRecurrings = Array.isArray(current.recurringTasks) ? current.recurringTasks : [];

  console.log(
    `   Já tem: ${existingCategories.length} categorias, ${existingRecurrings.length} recorrentes.`
  );

  const result = applyTemplate({
    template: TEMPLATE,
    existingCategories,
    existingRecurrings
  });

  console.log(`✨ Vou adicionar: ${result.addedCategories} categorias, ${result.addedRecurrings} recorrentes.`);

  if (result.addedCategories === 0 && result.addedRecurrings === 0) {
    console.log('   Nada a fazer — tudo já está lá.');
    process.exit(0);
  }

  await setDoc(
    ref,
    {
      categories: result.mergedCategories,
      recurringTasks: result.mergedRecurrings
    },
    { merge: true }
  );

  console.log(`✅ Gravado em users/${USERNAME}.`);
  console.log(`   Total agora: ${result.mergedCategories.length} categorias, ${result.mergedRecurrings.length} recorrentes.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
});
