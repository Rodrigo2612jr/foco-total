// Configura o destinatário e horário do check-in diretamente no Firestore.
// Uso: node scripts/set-checkin-config.mjs [username]

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

const CHECKIN_CONFIG = {
  recipientName: 'Camila',
  whatsappRecipient: '+5511954209394', // DDI 55 + DDD 11 + número
  reminderHour: 17,
  reminderMinute: 40
};

async function run() {
  console.log(`🔥 Conectando ao Firestore...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const ref = doc(db, 'users', USERNAME);
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data().checkinConfig ?? {}) : {};

  const merged = { ...current, ...CHECKIN_CONFIG };
  await setDoc(ref, { checkinConfig: merged }, { merge: true });

  console.log(`✅ Check-in configurado em users/${USERNAME}:`);
  console.log(`   Destinatário: ${merged.recipientName} (${merged.whatsappRecipient})`);
  console.log(`   Lembrete: ${String(merged.reminderHour).padStart(2, '0')}:${String(merged.reminderMinute).padStart(2, '0')}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro:', err?.message ?? err);
  process.exit(1);
});
