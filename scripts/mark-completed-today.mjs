// Marca tarefas com completedAt = agora, por ID.
// Uso: node scripts/mark-completed-today.mjs <id1> [id2] [id3] ...

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
const ids = new Set(process.argv.slice(2));
if (ids.size === 0) {
  console.log('Uso: node scripts/mark-completed-today.mjs <id1> [id2] ...');
  process.exit(1);
}

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const ref = doc(db, 'users', USERNAME);
  const snap = await getDoc(ref);
  const tasks = snap.data()?.tasks || [];
  const now = new Date().toISOString();
  let marked = 0;
  const newTasks = tasks.map((t) => {
    if (ids.has(t.id)) {
      marked++;
      console.log(`✓ Marcando: "${t.title}"`);
      return { ...t, completed: true, completedAt: now };
    }
    return t;
  });
  if (marked === 0) {
    console.log('Nenhum ID encontrado.');
    process.exit(0);
  }
  await setDoc(ref, { tasks: newTasks }, { merge: true });
  console.log(`\n✅ ${marked} tarefa(s) marcada(s) com completedAt=${now}`);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
