// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbK2t19v1UUZfv7GFc4r0qUoWZydOmJQo",
  authDomain: "edsfwsgers.firebaseapp.com",
  projectId: "edsfwsgers",
  storageBucket: "edsfwsgers.firebasestorage.app",
  messagingSenderId: "390166705764",
  appId: "1:390166705764:web:28eca2980a7a9084801171",
  measurementId: "G-1JHRGC6L60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Tắt analytics để tránh cảnh báo/blocked trên adblock & không dùng
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

