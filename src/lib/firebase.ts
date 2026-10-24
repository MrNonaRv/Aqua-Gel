import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfigJson);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfigJson.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
