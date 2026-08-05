const fs = require('fs');
let s = fs.readFileSync('src/pages/customer/CustomerPortal.tsx', 'utf8');
s = s.replace(
  "  useEffect(() => {\n    // Handle return from PayMongo",
  "  useEffect(() => {\n    console.log('useEffect running, orders:', orders);\n    // Handle return from PayMongo"
);
fs.writeFileSync('src/pages/customer/CustomerPortal.tsx', s);
