const fs = require('fs');

// Fix Reports.tsx
let rep = fs.readFileSync('src/pages/admin/Reports.tsx', 'utf8');
rep = rep.replace(
  "finalOrders.sort((a,b)=>b.date - a.date).map",
  "[...finalOrders].sort((a,b)=>b.date - a.date).map"
);
fs.writeFileSync('src/pages/admin/Reports.tsx', rep);

// Fix CustomerPortal.tsx
let port = fs.readFileSync('src/pages/customer/CustomerPortal.tsx', 'utf8');
port = port.replace(
  "  useEffect(() => {\n    console.log('useEffect running, orders:', orders);\n    // Handle return from PayMongo",
  "  useEffect(() => {\n    // Handle return from PayMongo"
);
// Remove orders from dependency array so it only runs on mount
port = port.replace(
  "  }, [orders, setOrders]);",
  "    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);"
);

// Fix Dashboard.tsx
let dash = fs.readFileSync('src/pages/admin/Dashboard.tsx', 'utf8');
// check if it has a sort without spreading, though we saw [...orders].sort
fs.writeFileSync('src/pages/customer/CustomerPortal.tsx', port);
