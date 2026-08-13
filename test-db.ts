import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "automatic-climate-zgxqk",
  appId: "1:557160494463:web:61726a040bf3571277964a",
  apiKey: "AIzaSyDdkUg7F-3rd028W8BbdTU9ZTki8-NESR0",
  authDomain: "automatic-climate-zgxqk.firebaseapp.com",
  storageBucket: "automatic-climate-zgxqk.firebasestorage.app",
  messagingSenderId: "557160494463"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-aquagel-2d88a1e5-4ed7-4732-9645-6b7bdda0a437");

async function testDb() {
  try {
    console.log("Connecting to Firestore...");
    const docRef = doc(db, 'store', 'settings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        console.log("Success! Cloud database is active and reachable.");
        const data = docSnap.data();
        console.log("Database response (Settings):", data.value);
    } else {
        console.log("Database connected, but no data found yet! Open the app preview to trigger the initial migration.");
    }
  } catch (e) {
    console.error("Error accessing Firestore:", e);
  }
  process.exit();
}
testDb();
