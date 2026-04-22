// Script one-shot: remove as instâncias recorrentes atrasadas (scheduledDate
// anterior a hoje) do user pascoto. Mantém o recurringGenerationLog intacto
// pra que o catch-up não regere esses dias de novo.
//
// Uso:
//   node scripts/cleanup-overdue-routines.mjs [username]
// Default username = 'pascoto'

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAsBPgsRCnUOKfi_g6nY_4NAa60maKS_9s',
  authDomain: 'foco-total-5d7bd.firebaseapp.com',
  projectId: 'foco-total-5d7bd',
  storageBucket: 'foco-total-5d7bd.firebasestorage.app',
  messagingSenderId: '525962296758',
  appId: '1:525962296758:web:92a7ee365f63b7c2ca1517',
  measurementId: 'G-NZHXSY5Q92'
};

const USERNAME = process.argv[2] || 'pascoto';

function startOfTodayISODate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function run() {
  console.log(`🔥 Conectando ao Firestore (${firebaseConfig.projectId})...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const ref = doc(db, 'users', USERNAME);
  console.log(`📖 Lendo users/${USERNAME}...`);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log(`   users/${USERNAME} não existe. Nada a limpar.`);
    process.exit(0);
  }

  const data = snap.data();
  const allTasks = Array.isArray(data.tasks) ? data.tasks : [];
  const today = startOfTodayISODate();

  // Separa: (a) instâncias recorrentes anteriores a hoje → REMOVER
  //         (b) resto (tudo sem recurringTaskId OU de hoje em diante) → MANTER
  const toRemove = [];
  const toKeep = [];
  for (const t of allTasks) {
    if (!t.recurringTaskId) {
      toKeep.push(t);
      continue;
    }
    const scheduled = new Date(t.scheduledDate);
    // Se tem recurringTaskId e é anterior a hoje → remove
    if (scheduled < today) {
      toRemove.push(t);
    } else {
      toKeep.push(t);
    }
  }

  console.log(`   Total de tasks: ${allTasks.length}`);
  console.log(`   Instâncias recorrentes atrasadas (a remover): ${toRemove.length}`);
  console.log(`   Permanecem (avulsas + hoje em diante): ${toKeep.length}`);

  if (toRemove.length === 0) {
    console.log('   Nada a limpar.');
    process.exit(0);
  }

  // Salva só o array tasks; recurringGenerationLog fica intacto (não regera os dias removidos)
  await setDoc(ref, { tasks: toKeep }, { merge: true });

  console.log(`✅ Removidas ${toRemove.length} instâncias atrasadas de users/${USERNAME}.`);
  console.log(`   Tasks finais: ${toKeep.length}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
});
