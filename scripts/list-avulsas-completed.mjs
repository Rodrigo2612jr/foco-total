// Lista todas as tarefas avulsas (sem recurringTaskId) que estão concluídas
// e SEM completedAt (legadas — marcadas antes do fix).
// Pra identificar quais o user quer marcar como "concluídas hoje".

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

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
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];

  // Avulsas (sem recurringTaskId) + completed=true + sem completedAt
  const candidates = tasks.filter(
    (t) => !t.recurringTaskId && t.completed === true && !t.completedAt
  );

  console.log(`\n📋 Tarefas avulsas concluídas SEM completedAt em users/${USERNAME}:`);
  console.log(`   Total: ${candidates.length}\n`);

  candidates.forEach((t, i) => {
    const agendada = t.scheduledDate ? new Date(t.scheduledDate).toISOString().slice(0, 10) : '?';
    const criada = t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : '?';
    console.log(`${String(i + 1).padStart(2, ' ')}. [${t.category ?? 'sem cat'}] ${t.title}`);
    console.log(`     id=${t.id}  agendada=${agendada}  criada=${criada}`);
  });

  process.exit(0);
}

run().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
