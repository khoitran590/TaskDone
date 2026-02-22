import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Replace with your Firebase project config from Firebase Console:
// Project Settings > Your apps > Add app > Config
const firebaseConfig = {
  apiKey: "AIzaSyAMCuKR5ZXrsxrTCVWHkkPSfvshuxv6jng",
  authDomain: "taskdone-9607f.firebaseapp.com",
  projectId: "taskdone-9607f",
  storageBucket: "taskdone-9607f.firebasestorage.app",
  messagingSenderId: "16587038652",
  appId: "1:16587038652:web:94044187b2f8333c5855b9",
  measurementId: "G-ZNPPWV29CJ"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
