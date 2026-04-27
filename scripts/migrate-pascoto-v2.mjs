// Migra o user pascoto pro template v2:
// - Adiciona excludedDaysOfWeek nas diárias (financeiras: dom+sáb; resto: dom)
// - Adiciona 4 sprints quinzenais (segunda 27/abril, biweekly)
// - Adiciona 'Planejar degustação' (quarta) e 'Degustação' (sábado)
// - REMOVE C1, C2, P4 mensais (vão pra dentro dos sprints)
//
// Uso: node scripts/migrate-pascoto-v2.mjs

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { randomUUID } from 'node:crypto';

const firebaseConfig = {
  apiKey: 'AIzaSyAsBPgsRCnUOKfi_g6nY_4NAa60maKS_9s',
  projectId: 'foco-total-5d7bd',
  authDomain: 'foco-total-5d7bd.firebaseapp.com',
  storageBucket: 'foco-total-5d7bd.firebasestorage.app',
  messagingSenderId: '525962296758',
  appId: '1:525962296758:web:92a7ee365f63b7c2ca1517'
};

const USERNAME = 'pascoto';
const REFERENCE_DATE = '2026-04-27'; // primeira segunda dos sprints quinzenais

// Mapas de exclusão por título (regex pra match flexível)
const EXCLUSION_RULES = [
  { match: /F1.*pagar boletos/i, exclude: [0, 6] },
  { match: /F2.*e-mails do financeiro/i, exclude: [0, 6] },
  { match: /Check-in matinal/i, exclude: [0] },
  { match: /Monitorar an[uú]ncios do site/i, exclude: [0] },
  { match: /Monitorar an[uú]ncios da loja/i, exclude: [0] },
  { match: /Acompanhar Grupo VIP/i, exclude: [0] },
  { match: /Checar site/i, exclude: [0] }
];

// Tarefas a remover (eram mensais, viraram sprints quinzenais)
const REMOVE_RULES = [
  /C1.*revisar crescimento/i,
  /C2.*planejar a[çc][õo]es de engajamento/i,
  /P4.*revisar processos candidatos a automa[çc][ãa]o/i
];

// Novas tarefas a adicionar
const NEW_TASKS = [
  // 4 SPRINTS QUINZENAIS (segunda 27/abril, biweekly)
  { title: '🎯 Sprint Marketing — análise + criar anúncios + ideias VIP', categoryName: 'Marketing', frequency: 'biweekly', dayOfWeek: 1, referenceDate: REFERENCE_DATE },
  { title: '🎯 Sprint Clube de Fidelidade — análise + ideias engajamento e recompra', categoryName: 'Clube de Fidelidade', frequency: 'biweekly', dayOfWeek: 1, referenceDate: REFERENCE_DATE },
  { title: '🎯 Sprint Grupo VIP — calendário de promo + conteúdo da quinzena', categoryName: 'Marketing', frequency: 'biweekly', dayOfWeek: 1, referenceDate: REFERENCE_DATE },
  { title: '🎯 Sprint Site — análise + ideias pra escalar vendas', categoryName: 'E-commerce/Site', frequency: 'biweekly', dayOfWeek: 1, referenceDate: REFERENCE_DATE },
  // QUARTA — planejar degustação
  { title: '🥄 Planejar Degustação de Sábado — escolher produto + negociar fornecedor', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [3] },
  // SÁBADO — degustação
  { title: '⭐ Degustação na loja', categoryName: 'Marketing', frequency: 'weekly', daysOfWeek: [6] }
];

async function run() {
  console.log('🔥 Conectando ao Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const ref = doc(db, 'users', USERNAME);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log('User não existe.');
    process.exit(1);
  }

  const data = snap.data();
  const recurringTasks = Array.isArray(data.recurringTasks) ? [...data.recurringTasks] : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  let modified = 0;
  let removed = 0;
  let added = 0;

  // 1) APLICAR EXCLUSÕES nas diárias existentes
  const updatedRecurrings = recurringTasks.flatMap((rec) => {
    // Verifica se deve ser removida
    if (REMOVE_RULES.some((re) => re.test(rec.title))) {
      removed++;
      console.log(`✗ Removendo: ${rec.title}`);
      return [];
    }

    // Aplica exclusão de dias se a regra bater (e for daily)
    if (rec.frequency === 'daily') {
      const rule = EXCLUSION_RULES.find((r) => r.match.test(rec.title));
      if (rule) {
        const current = JSON.stringify((rec.excludedDaysOfWeek || []).slice().sort());
        const next = JSON.stringify(rule.exclude.slice().sort());
        if (current !== next) {
          modified++;
          console.log(`✓ Excluindo dias [${rule.exclude.join(',')}] em: ${rec.title}`);
          return [{ ...rec, excludedDaysOfWeek: rule.exclude }];
        }
      }
    }
    return [rec];
  });

  // 2) ADICIONAR novas tarefas (verifica duplicatas por título exato)
  const existingTitles = new Set(updatedRecurrings.map((r) => r.title.trim().toLowerCase()));
  for (const tpl of NEW_TASKS) {
    const key = tpl.title.trim().toLowerCase();
    if (existingTitles.has(key)) continue;
    const cat = catByName.get(tpl.categoryName.toLowerCase());
    const newRec = {
      id: randomUUID(),
      title: tpl.title,
      categoryId: cat?.id,
      category: cat?.name ?? tpl.categoryName,
      frequency: tpl.frequency,
      active: true,
      createdAt: new Date().toISOString()
    };
    if (tpl.dayOfWeek !== undefined) newRec.dayOfWeek = tpl.dayOfWeek;
    if (tpl.daysOfWeek) newRec.daysOfWeek = tpl.daysOfWeek;
    if (tpl.dayOfMonth !== undefined) newRec.dayOfMonth = tpl.dayOfMonth;
    if (tpl.referenceDate) newRec.referenceDate = tpl.referenceDate;
    updatedRecurrings.push(newRec);
    added++;
    console.log(`+ Adicionando: ${tpl.title}`);
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   Modificadas (exclusão de dias): ${modified}`);
  console.log(`   Removidas (mensais → quinzenais): ${removed}`);
  console.log(`   Adicionadas (sprints + degustação): ${added}`);
  console.log(`   Total final: ${updatedRecurrings.length}`);

  if (modified === 0 && removed === 0 && added === 0) {
    console.log('\n   Nada a fazer.');
    process.exit(0);
  }

  await setDoc(ref, { recurringTasks: updatedRecurrings }, { merge: true });
  console.log(`\n✅ Migrado users/${USERNAME}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
