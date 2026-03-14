import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDs3RRHFfqN0m4xagEbw0wDyXCGDZuoU2E",
  authDomain: "clinica-karina-lara.firebaseapp.com",
  projectId: "clinica-karina-lara",
  storageBucket: "clinica-karina-lara.firebasestorage.app",
  messagingSenderId: "852266847070",
  appId: "1:852266847070:web:3827b70100a9475286ddcf",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
console.log("Firebase inicializado:", app.name);