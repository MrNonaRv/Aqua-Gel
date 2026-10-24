import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfigJson);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfigJson.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
signInAnonymously(auth).catch((err) => {
  console.warn("Anonymous auth notice:", err);
});

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();
