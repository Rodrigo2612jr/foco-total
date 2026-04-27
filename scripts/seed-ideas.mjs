// Sobe 35 ideias estratégicas como projetos no status "Ideia" (backlog)
// no user pascoto. Cada uma fica esperando você aceitar (=> escrever a estratégia)
// e depois iniciar (=> adicionar sub-tarefas).
//
// Uso: node scripts/seed-ideas.mjs

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

// 35 ideias agrupadas por frente
const IDEAS = [
  // === MARKETING / ANÚNCIOS (7) ===
  { categoryName: 'Marketing', title: 'Anúncio topo de funil — vídeo educativo/receita' },
  { categoryName: 'Marketing', title: 'Anúncio fundo de funil — cupom 1ª compra' },
  { categoryName: 'Marketing', title: 'Anúncio captação Grupo VIP (lead WhatsApp)' },
  { categoryName: 'Marketing', title: 'Retargeting de quem visitou o site' },
  { categoryName: 'Marketing', title: 'Lookalike dos melhores clientes' },
  { categoryName: 'Marketing', title: 'Anúncio pra movimentar Instagram (engajamento)' },
  { categoryName: 'Marketing', title: 'Anúncio local da loja física (Osasco e região)' },

  // === GRUPO VIP (na frente Marketing) (6) ===
  { categoryName: 'Marketing', title: 'Grupo VIP — Mix 60% promo / 40% educativo' },
  { categoryName: 'Marketing', title: 'Grupo VIP — Bot WhatsApp boas-vindas no privado' },
  { categoryName: 'Marketing', title: 'Grupo VIP — Stories enquete mensal pra ouvir base' },
  { categoryName: 'Marketing', title: 'Grupo VIP — Receitas exclusivas só pro VIP' },
  { categoryName: 'Marketing', title: 'Grupo VIP — PDF Guia do Empório no onboarding' },
  { categoryName: 'Marketing', title: 'Grupo VIP — Pré-venda de lançamento exclusiva' },

  // === CLUBE DE FIDELIDADE (13) ===
  { categoryName: 'Clube de Fidelidade', title: 'Sistema de pontos integrado site + PDV físico' },
  { categoryName: 'Clube de Fidelidade', title: 'Etiqueta dual nos potes (preço cheio + preço membro)' },
  { categoryName: 'Clube de Fidelidade', title: 'Cupom boas-vindas SITE (cadastro/login, antes da 1ª compra)' },
  { categoryName: 'Clube de Fidelidade', title: 'Cupom pós-1ª-compra LOJA FÍSICA (3 dias depois, próxima compra)' },
  { categoryName: 'Clube de Fidelidade', title: 'Mensagem pós-compra diferenciada (1ª vs subsequentes)' },
  { categoryName: 'Clube de Fidelidade', title: 'Mensagem carrinho abandonado (só site)' },
  { categoryName: 'Clube de Fidelidade', title: 'Mensagem de aniversário com cupom + pontos' },
  { categoryName: 'Clube de Fidelidade', title: 'Mensagem de reativação 30 dias sem comprar' },
  { categoryName: 'Clube de Fidelidade', title: 'Aviso de pontos prestes a expirar (90 dias)' },
  { categoryName: 'Clube de Fidelidade', title: 'Convite Grupo VIP automático após 1ª compra' },
  { categoryName: 'Clube de Fidelidade', title: 'Sorteio mensal exclusivo membros' },
  { categoryName: 'Clube de Fidelidade', title: 'Programa de indicação premiada' },
  { categoryName: 'Clube de Fidelidade', title: 'Promoção da Semana exclusiva membros' },

  // === SITE / E-COMMERCE (9) ===
  { categoryName: 'E-commerce/Site', title: 'Pop-up captura lead com cupom + entrada no Clube' },
  { categoryName: 'E-commerce/Site', title: 'Sistema de cupom único por CPF (mostra/some no login)' },
  { categoryName: 'E-commerce/Site', title: 'Blog de receitas (SEO orgânico)' },
  { categoryName: 'E-commerce/Site', title: 'Páginas categoria educativas (oleaginosas, temperos, etc)' },
  { categoryName: 'E-commerce/Site', title: 'Combos pré-montados como categoria do site' },
  { categoryName: 'E-commerce/Site', title: 'Cross-sell automático no checkout ("também levam")' },
  { categoryName: 'E-commerce/Site', title: 'WhatsApp flutuante de SAC (verificar se já tem)' },
  { categoryName: 'E-commerce/Site', title: 'Reviews dos clientes na página do produto' },
  { categoryName: 'E-commerce/Site', title: 'Página "Sobre" humanizada (história + equipe)' }
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
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const existing = Array.isArray(data.frenteProjects) ? data.frenteProjects : [];

  // Não duplica por título exato
  const existingTitles = new Set(existing.map((p) => p.title.trim().toLowerCase()));

  const newProjects = [];
  let skipped = 0;
  for (const idea of IDEAS) {
    const key = idea.title.trim().toLowerCase();
    if (existingTitles.has(key)) {
      skipped++;
      continue;
    }
    const cat = catByName.get(idea.categoryName.toLowerCase());
    newProjects.push({
      id: randomUUID(),
      categoryName: cat?.name ?? idea.categoryName,
      title: idea.title,
      status: 'backlog', // Ideia
      steps: [],
      createdAt: new Date().toISOString()
    });
  }

  console.log(`📋 Total ideias propostas: ${IDEAS.length}`);
  console.log(`   Já existentes (skipadas): ${skipped}`);
  console.log(`   Novas a criar: ${newProjects.length}`);

  if (newProjects.length === 0) {
    console.log('Nada a criar.');
    process.exit(0);
  }

  // Agrupa por categoria pra log
  const grouped = {};
  newProjects.forEach((p) => {
    grouped[p.categoryName] = (grouped[p.categoryName] || 0) + 1;
  });
  console.log('\n   Por frente:');
  Object.entries(grouped).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count}`);
  });

  await setDoc(ref, { frenteProjects: [...newProjects, ...existing] }, { merge: true });
  console.log(`\n✅ ${newProjects.length} ideias criadas em users/${USERNAME} com status "Ideia".`);
  console.log('   Abra Frentes → categoria → aba 🚀 Projetos pra ver.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
