// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDanAKVBq6oKupkBxnPNegF7wTcNZDcqAo",
  authDomain: "guia-projeto-vinho.firebaseapp.com",
  projectId: "guia-projeto-vinho",
  storageBucket: "guia-projeto-vinho.firebasestorage.app",
  messagingSenderId: "804090443964",
  appId: "1:804090443964:web:01c0dcb18a3c63c1a4b8b9"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);