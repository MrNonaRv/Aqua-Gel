import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
const app = initializeApp({ projectId: "test-project" });
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, "my-db");
console.log(db.type);
