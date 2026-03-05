// ⚠️ REPLACE the values below with YOUR Firebase config
// You'll get these values from Step 3 of the setup guide

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbv9GpjYQ69fVVXIJXV3seipxHrTTxHVg",
  authDomain: "pepper-walks.firebaseapp.com",
  projectId: "pepper-walks",
  storageBucket: "pepper-walks.firebasestorage.app",
  messagingSenderId: "1055209003025",
  appId: "1:1055209003025:web:c274e904b696c1f29b79b0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
