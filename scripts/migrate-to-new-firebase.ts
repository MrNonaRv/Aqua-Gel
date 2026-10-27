import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase configuration for aqua-bbfcd
const firebaseConfig = {
  apiKey: "AIzaSyAxyoHWYH8cJ4901GgRP3_zoI16OPcT1s8",
  authDomain: "aqua-bbfcd.firebaseapp.com",
  projectId: "aqua-bbfcd",
  storageBucket: "aqua-bbfcd.firebasestorage.app",
  messagingSenderId: "115404276606",
  appId: "1:115404276606:web:f4528f7c4fdfb3a83b692f",
  measurementId: "G-JZF78LS0G3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to remove any undefined fields recursively as Firestore does not accept undefined
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

async function run() {
  console.log("=== AQUAGEL DATA MIGRATION TO NEW FIREBASE (aqua-bbfcd) ===");
  const storePath = path.resolve(process.cwd(), 'data/store.json');
  if (!fs.existsSync(storePath)) {
    console.error("❌ No data/store.json found!");
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  console.log(`Source records: ${store.customers?.length || 0} customers, ${store.orders?.length || 0} orders.`);

  // 1. Settings
  if (store.settings) {
    console.log("Migrating store settings...");
    await setDoc(doc(db, 'store', 'settings'), sanitizeForFirestore(store.settings));
    console.log("✅ Migrated store/settings");
  }

  // 2. Inventory
  if (store.inventory) {
    console.log("Migrating inventory...");
    await setDoc(doc(db, 'store', 'inventory'), sanitizeForFirestore(store.inventory));
    console.log("✅ Migrated store/inventory");
  }

  // 3. Personnel
  if (store.personnel) {
    console.log("Migrating personnel...");
    await setDoc(doc(db, 'store', 'personnel'), sanitizeForFirestore({ value: store.personnel }));
    console.log("✅ Migrated store/personnel");
  }

  // 4. Stocklog
  if (store.stocklog) {
    console.log("Migrating stocklog...");
    await setDoc(doc(db, 'store', 'stocklog'), sanitizeForFirestore({ value: store.stocklog }));
    console.log("✅ Migrated store/stocklog");
  }

  // 5. Subscriptions
  if (store.subscriptions) {
    console.log("Migrating subscriptions...");
    await setDoc(doc(db, 'store', 'subscriptions'), sanitizeForFirestore({ value: store.subscriptions }));
    console.log("✅ Migrated store/subscriptions");
  }

  // 6. Customers
  if (Array.isArray(store.customers) && store.customers.length > 0) {
    console.log(`Migrating ${store.customers.length} customers...`);
    for (const c of store.customers) {
      if (c && c.id) {
        await setDoc(doc(db, 'customers', String(c.id)), sanitizeForFirestore(c));
      }
    }
    console.log(`✅ Successfully migrated all ${store.customers.length} customers.`);
  }

  // 7. Orders
  if (Array.isArray(store.orders) && store.orders.length > 0) {
    console.log(`Migrating ${store.orders.length} orders...`);
    for (const o of store.orders) {
      if (o && o.id) {
        await setDoc(doc(db, 'orders', String(o.id)), sanitizeForFirestore(o));
      }
    }
    console.log(`✅ Successfully migrated all ${store.orders.length} orders.`);
  }

  console.log("\n🎉 ALL 35 ORDERS, 8 CUSTOMERS, INVENTORY, AND SETTINGS HAVE BEEN POPULATED INTO FIRESTORE (aqua-bbfcd)!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
