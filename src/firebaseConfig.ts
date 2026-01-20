import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDanAKVBq6oKupkBxnPNegF7wTcNZDcqAo",
  authDomain: "guia-projeto-vinho.firebaseapp.com",
  projectId: "guia-projeto-vinho",
  storageBucket: "guia-projeto-vinho.firebasestorage.app",
  messagingSenderId: "804090443964",
  appId: "1:804090443964:web:01c0dcb18a3c63c1a4b8b9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
