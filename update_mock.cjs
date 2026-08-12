const fs = require('fs');
let s = fs.readFileSync('src/lib/store.tsx', 'utf8');

// I will add a tiny useEffect in StoreProvider to shift all order dates to the present week so they can see data
s = s.replace(
  "  useEffect(() => {\n    // Cleanup any lingering 'undefined' in localStorage",
  `  useEffect(() => {\n    // Shift mock dates to current week so they don't age out during preview\n    const shifted = localStorage.getItem('ag_mock_shifted');\n    if (!shifted) {\n      const stored = localStorage.getItem('ag_orders');\n      if (stored && stored !== 'undefined') {\n        try {\n          const parsed = JSON.parse(stored);\n          const now = Date.now();\n          const maxDate = Math.max(...parsed.map(o => o.date));\n          const diff = now - maxDate;\n          if (diff > 86400000) {\n            const updated = parsed.map(o => ({...o, date: o.date + diff, paidDate: o.paidDate ? o.paidDate + diff : undefined}));\n            localStorage.setItem('ag_orders', JSON.stringify(updated));\n            localStorage.setItem('ag_mock_shifted', 'true');\n          }\n        } catch(e) {}\n      }\n    }\n\n    // Cleanup any lingering 'undefined' in localStorage`
);
fs.writeFileSync('src/lib/store.tsx', s);
