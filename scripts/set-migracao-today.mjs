// Marca o projeto "Migração Shopify → Tray" como começando HOJE
// e marca as 2 primeiras etapas como dueDate=hoje pra mostrar no bloco
// "Projetos pra Hoje" na tela /tarefas.

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
const TITLE_RE = /Migra[çc][ãa]o Shopify/i;
const todayKey = new Date().toISOString().slice(0, 10);

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
  const projects = Array.isArray(data.frenteProjects) ? data.frenteProjects : [];
  const target = projects.find((p) => TITLE_RE.test(p.title));
  if (!target) {
    console.log('Projeto não encontrado.');
    process.exit(1);
  }

  console.log(`📋 Projeto encontrado: ${target.title}`);
  console.log(`   Etapas atuais: ${target.steps.length}`);

  // Marca startDate = hoje
  // Marca dueDate=hoje nas 2 primeiras etapas pendentes
  let marcadasParaHoje = 0;
  const newSteps = target.steps.map((s) => {
    if (!s.done && marcadasParaHoje < 2) {
      marcadasParaHoje++;
      console.log(`   📌 "${s.text}" → pra hoje`);
      return { ...s, dueDate: todayKey };
    }
    return s;
  });

  const updatedProject = {
    ...target,
    startDate: todayKey,
    steps: newSteps
  };

  console.log(`   📅 startDate: ${todayKey}`);

  const newProjects = projects.map((p) => (p.id === target.id ? updatedProject : p));
  await setDoc(ref, { frenteProjects: newProjects }, { merge: true });
  console.log(`\n✅ Atualizado em users/${USERNAME}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
