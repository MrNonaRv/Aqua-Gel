const fs = require('fs');

let s = fs.readFileSync('src/lib/store.tsx', 'utf8');

// 1. Remove session from collections
s = s.replace(
  "{ key: 'session', localKey: 'ag_session', default: null },\n",
  ""
);
s = s.replace(
  "{ key: 'session', localKey: 'ag_session', default: null },\r\n",
  ""
);

// 2. Remove unsubSession listener
s = s.replace(
  /const unsubSession = onSnapshot\(doc\(db, 'store', 'session'\).*?;\n/,
  ""
);
s = s.replace(
  /const unsubSession = onSnapshot\(doc\(db, 'store', 'session'\).*?;\r\n/,
  ""
);

// 3. Remove unsubSession from cleanup
s = s.replace("unsubSession(); ", "");

// 4. Fix setSession function
s = s.replace(
  "const setSession = (s: User | null) => { _setSession(s); setDoc(doc(db, 'store', 'session'), { value: cleanData(s) }); };",
  "const setSession = (s: User | null) => { _setSession(s); localStorage.setItem('ag_session', JSON.stringify(s)); };"
);

fs.writeFileSync('src/lib/store.tsx', s);
