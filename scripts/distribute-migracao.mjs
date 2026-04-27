// Distribui as etapas pendentes do projeto "Migração Shopify → Tray"
// 2 por dia, começando hoje, pulando sáb e dom.

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
const PER_DAY = 2;
const SKIP_DAYS = new Set([0, 6]); // dom, sáb

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function nextValidDay(d) {
  let cur = new Date(d);
  let safety = 14;
  while (SKIP_DAYS.has(cur.getDay()) && safety-- > 0) {
    cur.setDate(cur.getDate() + 1);
  }
  return cur;
}

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

  let date = new Date();
  date.setHours(0, 0, 0, 0);
  date = nextValidDay(date);
  let countOnDate = 0;

  console.log(`📋 Distribuindo etapas pendentes de "${target.title}"`);
  console.log(`   ${PER_DAY} por dia, pulando sáb/dom\n`);

  const updatedSteps = target.steps.map((s) => {
    if (s.done) return s;
    if (s.dueDate) return s; // não sobrescreve quem já tem data
    while (countOnDate >= PER_DAY) {
      date.setDate(date.getDate() + 1);
      date = nextValidDay(date);
      countOnDate = 0;
    }
    const dueDate = fmtDate(date);
    countOnDate++;
    console.log(`   ${dueDate} → ${s.text}`);
    return { ...s, dueDate };
  });

  const updatedProject = { ...target, steps: updatedSteps };
  const newProjects = projects.map((p) => (p.id === target.id ? updatedProject : p));
  await setDoc(ref, { frenteProjects: newProjects }, { merge: true });
  console.log(`\n✅ Atualizado em users/${USERNAME}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
