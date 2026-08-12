const fs = require('fs');
let s = fs.readFileSync('src/pages/admin/Reports.tsx', 'utf8');
s = s.replace(
  "const start = getRange(period);",
  "const start = getRange(period);\n  console.log('Orders length:', orders.length);\n  console.log('Start timestamp:', start);\n  console.log('Now:', now.getTime());\n  console.log('Orders dates:', orders.map(o => o.date));"
);
fs.writeFileSync('src/pages/admin/Reports.tsx', s);
