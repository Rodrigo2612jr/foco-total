// Remove a tarefa recorrente "Check-in matinal" do user pascoto + apaga
// todas as instâncias geradas dela em tasks (não importa data).

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAsBPgsRCnUOKfi_g6nY_4NAa60maKS_9s',
  projectId: 'foco-total-5d7bd',
  authDomain: 'foco-total-5d7bd.firebaseapp.com',
  storageBucket: 'foco-total-5d7bd.firebasestorage.app',
  messagingSenderId: '525962296758',
  appId: '1:525962296758:web:92a7ee365f63b7c2ca1517'
};

const USERNAME = 'pascoto';
const TITLE_RE = /Check-in matinal/i;

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const ref = doc(db, 'users', USERNAME);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log('User não existe.');
    process.exit(1);
  }

  const data = snap.data();
  const recurringTasks = Array.isArray(data.recurringTasks) ? data.recurringTasks : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];

  // Identifica os IDs das recorrentes a remover
  const targetRec = recurringTasks.filter((r) => TITLE_RE.test(r.title));
  const targetIds = new Set(targetRec.map((r) => r.id));

  if (targetIds.size === 0) {
    console.log('Nenhuma recorrente Check-in matinal encontrada.');
    process.exit(0);
  }

  console.log(`✗ Removendo ${targetRec.length} recorrente(s) Check-in matinal:`);
  targetRec.forEach((r) => console.log(`   - ${r.title} (id=${r.id})`));

  // Filtra recurringTasks (mantém só os que NÃO são target)
  const newRecurrings = recurringTasks.filter((r) => !targetIds.has(r.id));

  // Filtra tasks (remove instâncias com recurringTaskId em targetIds)
  const removedInstances = tasks.filter((t) => t.recurringTaskId && targetIds.has(t.recurringTaskId)).length;
  const newTasks = tasks.filter((t) => !t.recurringTaskId || !targetIds.has(t.recurringTaskId));

  console.log(`✗ Removendo ${removedInstances} instância(s) já geradas dessa recorrente`);
  console.log(`📊 Total de recorrentes: ${recurringTasks.length} → ${newRecurrings.length}`);
  console.log(`📊 Total de tasks: ${tasks.length} → ${newTasks.length}`);

  await setDoc(ref, { recurringTasks: newRecurrings, tasks: newTasks }, { merge: true });
  console.log(`\n✅ Limpo em users/${USERNAME}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
