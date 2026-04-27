// Cria o projeto "Migração Shopify → Tray" no user pascoto, na frente
// E-commerce/Site, com etapas pré-preenchidas.

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

const PROJECT = {
  id: randomUUID(),
  categoryName: 'E-commerce/Site',
  title: 'Migração Shopify → Tray',
  description:
    'Sair da Shopify e ir pra Tray. Garantir que tudo (produtos, checkout, frete, gateway, DNS) esteja funcionando antes de virar a chave.',
  status: 'doing',
  steps: [
    { id: randomUUID(), text: 'Exportar produtos da Shopify (CSV completo)', done: false },
    { id: randomUUID(), text: 'Importar produtos na Tray + ajustar SKU', done: false },
    { id: randomUUID(), text: 'Finalizar visual do site (tema + páginas internas)', done: false },
    { id: randomUUID(), text: 'Integrar gateway de pagamento', done: false },
    { id: randomUUID(), text: 'Configurar frete real no checkout', done: false },
    { id: randomUUID(), text: 'Migrar base de clientes/cadastros', done: false },
    { id: randomUUID(), text: 'Apontar DNS do domínio pra Tray', done: false },
    { id: randomUUID(), text: 'Rodar pedido teste de ponta a ponta', done: false },
    { id: randomUUID(), text: 'Comunicar mudança aos clientes (email + Grupo VIP)', done: false }
  ],
  startedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

async function run() {
  console.log('🔥 Conectando ao Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const ref = doc(db, 'users', USERNAME);
  const snap = await getDoc(ref);

  const data = snap.exists() ? snap.data() : {};
  const existing = Array.isArray(data.frenteProjects) ? data.frenteProjects : [];

  // Não duplica se já existe um com o mesmo título
  const dup = existing.find(
    (p) => p.title.trim().toLowerCase() === PROJECT.title.trim().toLowerCase()
  );
  if (dup) {
    console.log(`⚠️  Já existe um projeto com esse título (id=${dup.id}). Saindo sem alterar.`);
    process.exit(0);
  }

  const newList = [PROJECT, ...existing];
  await setDoc(ref, { frenteProjects: newList }, { merge: true });

  console.log(`✅ Criado: "${PROJECT.title}"`);
  console.log(`   Categoria: ${PROJECT.categoryName}`);
  console.log(`   Status: ${PROJECT.status}`);
  console.log(`   Etapas: ${PROJECT.steps.length}`);
  PROJECT.steps.forEach((s, i) => console.log(`     ${i + 1}. ${s.text}`));
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
