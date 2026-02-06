import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAsBPgsRCnUOKfi_g6nY_4NAa60maKS_9s",
  authDomain: "foco-total-5d7bd.firebaseapp.com",
  projectId: "foco-total-5d7bd",
  storageBucket: "foco-total-5d7bd.firebasestorage.app",
  messagingSenderId: "525962296758",
  appId: "1:525962296758:web:92a7ee365f63b7c2ca1517",
  measurementId: "G-NZHXSY5Q92"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
