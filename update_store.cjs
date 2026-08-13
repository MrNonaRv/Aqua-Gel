const fs = require('fs');

let s = fs.readFileSync('src/lib/store.tsx', 'utf8');

const imports = `import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';`;

s = s.replace("import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';", 
`import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
${imports}`);

// Replace the entire useEffect and setter functions
const newLogic = `
  useEffect(() => {
    // Migrate localStorage to Firebase on first load
    const migrateToFirebase = async () => {
      const collections = [
        { key: 'session', localKey: 'ag_session', default: null },
        { key: 'customers', localKey: 'ag_customers', default: SEED_CUSTOMERS },
        { key: 'orders', localKey: 'ag_orders', default: SEED_ORDERS },
        { key: 'inventory', localKey: 'ag_inventory', default: SEED_INVENTORY },
        { key: 'personnel', localKey: 'ag_personnel', default: SEED_PERSONNEL },
        { key: 'stocklog', localKey: 'ag_stocklog', default: [] },
        { key: 'settings', localKey: 'ag_settings', default: SEED_SETTINGS }
      ];

      for (const col of collections) {
        try {
          const d = await getDoc(doc(db, 'store', col.key));
          if (!d.exists()) {
            const local = localStorage.getItem(col.localKey);
            let val = col.default;
            if (local && local !== 'undefined') {
              try { val = JSON.parse(local); } catch(e) {}
            }
            await setDoc(doc(db, 'store', col.key), { value: val });
          }
        } catch (err) {
          console.error("Migration error for", col.key, err);
        }
      }
    };
    
    migrateToFirebase();

    const unsubSession = onSnapshot(doc(db, 'store', 'session'), (d) => { if (d.exists()) { _setSession(d.data().value); localStorage.setItem('ag_session', JSON.stringify(d.data().value)); } });
    const unsubCustomers = onSnapshot(doc(db, 'store', 'customers'), (d) => { if (d.exists()) { _setCustomers(d.data().value); localStorage.setItem('ag_customers', JSON.stringify(d.data().value)); } });
    const unsubOrders = onSnapshot(doc(db, 'store', 'orders'), (d) => { if (d.exists()) { _setOrders(d.data().value); localStorage.setItem('ag_orders', JSON.stringify(d.data().value)); } });
    const unsubInventory = onSnapshot(doc(db, 'store', 'inventory'), (d) => { if (d.exists()) { _setInventory(d.data().value); localStorage.setItem('ag_inventory', JSON.stringify(d.data().value)); } });
    const unsubPersonnel = onSnapshot(doc(db, 'store', 'personnel'), (d) => { if (d.exists()) { _setPersonnel(d.data().value); localStorage.setItem('ag_personnel', JSON.stringify(d.data().value)); } });
    const unsubStockLog = onSnapshot(doc(db, 'store', 'stocklog'), (d) => { if (d.exists()) { _setStockLog(d.data().value); localStorage.setItem('ag_stocklog', JSON.stringify(d.data().value)); } });
    const unsubSettings = onSnapshot(doc(db, 'store', 'settings'), (d) => { if (d.exists()) { _setSettings(d.data().value); localStorage.setItem('ag_settings', JSON.stringify(d.data().value)); } });

    return () => {
      unsubSession(); unsubCustomers(); unsubOrders(); unsubInventory(); unsubPersonnel(); unsubStockLog(); unsubSettings();
    };
  }, []);

  const setSession = (s: User | null) => { _setSession(s); setDoc(doc(db, 'store', 'session'), { value: s }); };
  const setCustomers = (c: Customer[]) => { _setCustomers(c); setDoc(doc(db, 'store', 'customers'), { value: c }); };
  const setOrders = (o: Order[]) => { _setOrders(o); setDoc(doc(db, 'store', 'orders'), { value: o }); };
  const setInventory = (i: Inventory) => { _setInventory(i); setDoc(doc(db, 'store', 'inventory'), { value: i }); };
  const setPersonnel = (p: string[]) => { _setPersonnel(p); setDoc(doc(db, 'store', 'personnel'), { value: p }); };
  const setStockLog = (l: { msg: string; time: number }[]) => { _setStockLog(l); setDoc(doc(db, 'store', 'stocklog'), { value: l }); };
  const setSettings = (s: Settings) => { _setSettings(s); setDoc(doc(db, 'store', 'settings'), { value: s }); };
`;

s = s.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);[\s\S]*?const setSettings = [^\n]+;/m, newLogic.trim());

fs.writeFileSync('src/lib/store.tsx', s);
