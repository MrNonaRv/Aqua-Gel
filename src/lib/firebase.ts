import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB3fJZI1JFjfwK-bx6towsmrgVH1wjdalU",
  authDomain: "aqua-gel.firebaseapp.com",
  projectId: "aqua-gel",
  storageBucket: "aqua-gel.firebasestorage.app",
  messagingSenderId: "329354057053",
  appId: "1:329354057053:web:eb1ef96c30e5eae9d944b4",
  measurementId: "G-5JYK3QYLYC"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
