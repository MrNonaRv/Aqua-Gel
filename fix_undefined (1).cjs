const fs = require('fs');

let s = fs.readFileSync('src/lib/store.tsx', 'utf8');

const helper = `const cleanData = (data: any) => JSON.parse(JSON.stringify(data));`;

s = s.replace(
  "const setSession = (s: User | null) => { _setSession(s); setDoc(doc(db, 'store', 'session'), { value: s }); };",
  `${helper}\n  const setSession = (s: User | null) => { _setSession(s); setDoc(doc(db, 'store', 'session'), { value: cleanData(s) }); };`
);
s = s.replace(
  "const setCustomers = (c: Customer[]) => { _setCustomers(c); setDoc(doc(db, 'store', 'customers'), { value: c }); };",
  "const setCustomers = (c: Customer[]) => { _setCustomers(c); setDoc(doc(db, 'store', 'customers'), { value: cleanData(c) }); };"
);
s = s.replace(
  "const setOrders = (o: Order[]) => { _setOrders(o); setDoc(doc(db, 'store', 'orders'), { value: o }); };",
  "const setOrders = (o: Order[]) => { _setOrders(o); setDoc(doc(db, 'store', 'orders'), { value: cleanData(o) }); };"
);
s = s.replace(
  "const setInventory = (i: Inventory) => { _setInventory(i); setDoc(doc(db, 'store', 'inventory'), { value: i }); };",
  "const setInventory = (i: Inventory) => { _setInventory(i); setDoc(doc(db, 'store', 'inventory'), { value: cleanData(i) }); };"
);
s = s.replace(
  "const setPersonnel = (p: string[]) => { _setPersonnel(p); setDoc(doc(db, 'store', 'personnel'), { value: p }); };",
  "const setPersonnel = (p: string[]) => { _setPersonnel(p); setDoc(doc(db, 'store', 'personnel'), { value: cleanData(p) }); };"
);
s = s.replace(
  "const setStockLog = (l: { msg: string; time: number }[]) => { _setStockLog(l); setDoc(doc(db, 'store', 'stocklog'), { value: l }); };",
  "const setStockLog = (l: { msg: string; time: number }[]) => { _setStockLog(l); setDoc(doc(db, 'store', 'stocklog'), { value: cleanData(l) }); };"
);
s = s.replace(
  "const setSettings = (s: Settings) => { _setSettings(s); setDoc(doc(db, 'store', 'settings'), { value: s }); };",
  "const setSettings = (s: Settings) => { _setSettings(s); setDoc(doc(db, 'store', 'settings'), { value: cleanData(s) }); };"
);

// We should also wrap the migration logic with cleanData
s = s.replace("await setDoc(doc(db, 'store', col.key), { value: val });", "await setDoc(doc(db, 'store', col.key), { value: cleanData(val) });");

fs.writeFileSync('src/lib/store.tsx', s);
