import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "automatic-climate-zgxqk",
  appId: "1:557160494463:web:61726a040bf3571277964a",
  apiKey: "AIzaSyDdkUg7F-3rd028W8BbdTU9ZTki8-NESR0",
  authDomain: "automatic-climate-zgxqk.firebaseapp.com",
  storageBucket: "automatic-climate-zgxqk.firebasestorage.app",
  messagingSenderId: "557160494463"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-aquagel-2d88a1e5-4ed7-4732-9645-6b7bdda0a437");
