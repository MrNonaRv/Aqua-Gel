const fs = require('fs');
let s = fs.readFileSync('src/pages/customer/CustomerPortal.tsx', 'utf8');
s = s.replace(
  "setOrders(prev => prev.map(o => o.id === orderId ? { ...o, checkoutUrl: data.checkoutUrl } : o));",
  "setOrders([newOrder, ...orders].map(o => o.id === orderId ? { ...o, checkoutUrl: data.checkoutUrl } : o));"
);
fs.writeFileSync('src/pages/customer/CustomerPortal.tsx', s);
