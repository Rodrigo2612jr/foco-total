// Busca tarefas avulsas concluídas sem completedAt por palavra-chave.
// Uso: node scripts/search-tasks.mjs <termo1> [termo2] ...

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAsBPgsRCnUOKfi_g6nY_4NAa60maKS_9s',
  authDomain: 'foco-total-5d7bd.firebaseapp.com',
  storageBucket: 'foco-total-5d7bd.firebasestorage.app',
  projectId: 'foco-total-5d7bd',
  messagingSenderId: '525962296758',
  appId: '1:525962296758:web:92a7ee365f63b7c2ca1517'
};

const USERNAME = 'pascoto';
const terms = process.argv.slice(2).map((t) => t.toLowerCase());
if (terms.length === 0) {
  console.log('Uso: node scripts/search-tasks.mjs <termo1> [termo2] ...');
  process.exit(1);
}

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'users', USERNAME));
  const tasks = (snap.data()?.tasks || []).filter(
    (t) => !t.recurringTaskId && t.completed === true && !t.completedAt
  );

  console.log(`\n🔍 Buscando em ${tasks.length} avulsas concluídas sem timestamp`);
  console.log(`   Termos: ${terms.join(', ')}\n`);

  for (const term of terms) {
    const hits = tasks.filter((t) => (t.title || '').toLowerCase().includes(term));
    console.log(`\n>>> "${term}" — ${hits.length} resultado(s):`);
    hits.forEach((t) => {
      const date = t.scheduledDate ? new Date(t.scheduledDate).toISOString().slice(0, 10) : '?';
      console.log(`   id=${t.id}`);
      console.log(`   [${date}] ${t.title}`);
    });
  }
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
