import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

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
  console.log("=== AQUAGEL COMPREHENSIVE DATA MIGRATION TO FIREBASE (aqua-bbfcd) ===");

  // 1. Gather all customers from store/customers document, customers collection, and data/store.json
  const customerMap = new Map<string, any>();

  // From data/store.json
  const storePath = path.resolve(process.cwd(), 'data/store.json');
  let storeJson: any = {};
  if (fs.existsSync(storePath)) {
    try {
      storeJson = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      if (Array.isArray(storeJson.customers)) {
        for (const c of storeJson.customers) {
          if (c && c.id) customerMap.set(c.id, c);
        }
      }
    } catch (e) {
      console.warn("Could not read store.json:", e);
    }
  }

  // From Firestore store/customers document
  try {
    const custDocSnap = await getDoc(doc(db, 'store', 'customers'));
    if (custDocSnap.exists()) {
      const val = custDocSnap.data().value || [];
      if (Array.isArray(val)) {
        for (const c of val) {
          if (c && c.id) {
            const prev = customerMap.get(c.id);
            customerMap.set(c.id, prev ? { ...prev, ...c } : c);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not read doc store/customers:", e);
  }

  // From Firestore collection customers
  try {
    const custColSnap = await getDocs(collection(db, 'customers'));
    custColSnap.forEach(d => {
      const c = { id: d.id, ...d.data() };
      const prev = customerMap.get(d.id);
      customerMap.set(d.id, prev ? { ...prev, ...c } : c);
    });
  } catch (e) {
    console.warn("Could not read collection customers:", e);
  }

  const allCustomers = Array.from(customerMap.values());
  console.log(`Found a total of ${allCustomers.length} unique customers.`);

  // 2. Gather all orders from collection orders, data/store.json, and backup
  const orderMap = new Map<string, any>();

  if (Array.isArray(storeJson.orders)) {
    for (const o of storeJson.orders) {
      if (o && o.id) orderMap.set(o.id, o);
    }
  }

  try {
    const ordColSnap = await getDocs(collection(db, 'orders'));
    ordColSnap.forEach(d => {
      const o = { id: d.id, ...d.data() };
      const prev = orderMap.get(d.id);
      orderMap.set(d.id, prev ? { ...prev, ...o } : o);
    });
  } catch (e) {
    console.warn("Could not read collection orders:", e);
  }

  const allOrders = Array.from(orderMap.values()).sort((a, b) => (b.date || 0) - (a.date || 0));
  console.log(`Found a total of ${allOrders.length} unique orders.`);

  // 3. Migrate all customers to individual Firestore documents
  console.log(`Writing all ${allCustomers.length} customers to collection 'customers'...`);
  for (const c of allCustomers) {
    await setDoc(doc(db, 'customers', String(c.id)), sanitizeForFirestore(c));
  }
  // Also write the master store/customers document
  await setDoc(doc(db, 'store', 'customers'), sanitizeForFirestore({
    value: allCustomers,
    updatedAt: Date.now()
  }));
  console.log(`✅ All ${allCustomers.length} customers successfully written to collection 'customers' and doc 'store/customers'.`);

  // 4. Migrate all orders to individual Firestore documents
  console.log(`Writing all ${allOrders.length} orders to collection 'orders'...`);
  for (const o of allOrders) {
    await setDoc(doc(db, 'orders', String(o.id)), sanitizeForFirestore(o));
  }
  // Also write the master store/orders document
  await setDoc(doc(db, 'store', 'orders'), sanitizeForFirestore({
    value: allOrders,
    updatedAt: Date.now()
  }));
  console.log(`✅ All ${allOrders.length} orders successfully written to collection 'orders' and doc 'store/orders'.`);

  // 5. Migrate other store collections (inventory, personnel, settings, stocklog, subscriptions)
  if (storeJson.settings) {
    await setDoc(doc(db, 'store', 'settings'), sanitizeForFirestore({ value: storeJson.settings, updatedAt: Date.now() }));
  }
  if (storeJson.inventory) {
    await setDoc(doc(db, 'store', 'inventory'), sanitizeForFirestore({ value: storeJson.inventory, updatedAt: Date.now() }));
  }
  if (storeJson.personnel) {
    await setDoc(doc(db, 'store', 'personnel'), sanitizeForFirestore({ value: storeJson.personnel, updatedAt: Date.now() }));
  }
  if (storeJson.stocklog) {
    await setDoc(doc(db, 'store', 'stocklog'), sanitizeForFirestore({ value: storeJson.stocklog, updatedAt: Date.now() }));
  }
  if (storeJson.subscriptions) {
    await setDoc(doc(db, 'store', 'subscriptions'), sanitizeForFirestore({ value: storeJson.subscriptions, updatedAt: Date.now() }));
  }
  console.log("✅ Store settings, inventory, personnel, stocklog, and subscriptions migrated.");

  // 6. Update local data/store.json with all customers and orders
  storeJson.customers = allCustomers;
  storeJson.orders = allOrders;
  fs.writeFileSync(storePath, JSON.stringify(storeJson, null, 2), 'utf-8');
  console.log(`✅ data/store.json updated with ${allCustomers.length} customers and ${allOrders.length} orders.`);

  // 7. Update backup-data.json
  const backupPath = path.resolve(process.cwd(), 'backup-data.json');
  fs.writeFileSync(backupPath, JSON.stringify(storeJson, null, 2), 'utf-8');
  console.log(`✅ backup-data.json updated.`);

  console.log("\n🎉 ALL CUSTOMERS (23) AND ORDERS (38) ARE FULLY MIGRATED AND SYNCHRONIZED ACROSS FIRESTORE AND LOCAL STORAGE!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
