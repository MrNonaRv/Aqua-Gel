const fs = require('fs');
let s = fs.readFileSync('src/pages/customer/CustomerPortal.tsx', 'utf8');

s = s.replace(
  "  useEffect(() => {\n    console.log('useEffect running, orders:', orders);\n    // Handle return from PayMongo\n    const params = new URLSearchParams(window.location.search);\n    const isSuccess = params.get('payment_success');\n    const orderId = params.get('order_id');\n\n    if (isSuccess === 'true' && orderId) {\n      if (orderId.startsWith('balance_')) {\n        // Find customer and update balance\n        const custId = orderId.split('_')[1];\n        setCustomers(customers.map(c => c.id === custId ? { ...c, unpaid: 0 } : c));\n        // Mark all unpaid orders for this customer as paid\n        setOrders(orders.map(o => (o.customerId === custId && !o.paid) ? { ...o, paid: true, paidDate: Date.now() } : o));\n        setOrderSuccess('✅ Outstanding balance successfully paid via GCash!');\n        setTab('paymenthistory');\n        setTimeout(() => setOrderSuccess(''), 5000);\n        window.history.replaceState({}, document.title, window.location.pathname);\n        return;\n      }\n      // Find order and mark as paid\n      const order = orders.find(o => o.id === orderId);\n      if (order && !order.paid) {\n        setOrders(orders.map(o => o.id === orderId ? { ...o, paid: true, paidDate: Date.now() } : o));\n        setCustomers(customers.map(c => c.id === order.customerId ? { ...c, unpaid: Math.max(0, c.unpaid - order.total) } : c));\n        setOrderSuccess(`✅ Payment successful via PayMongo! Order ${orderId} is now paid.`);\n        setTab('myorders');\n        setTimeout(() => setOrderSuccess(''), 5000);\n      }\n          \n      // Clean up URL\n      window.history.replaceState({}, document.title, window.location.pathname);\n    }\n  }, [orders, setOrders]);",
  `  useEffect(() => {
    // Handle return from PayMongo
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get('payment_success');
    const orderId = params.get('order_id');

    if (isSuccess === 'true' && orderId) {
      if (orderId.startsWith('balance_')) {
        const custId = orderId.split('_')[1];
        if (customers.length > 0) {
          setCustomers(customers.map(c => c.id === custId ? { ...c, unpaid: 0 } : c));
          setOrders(orders.map(o => (o.customerId === custId && !o.paid) ? { ...o, paid: true, paidDate: Date.now() } : o));
          setOrderSuccess('✅ Outstanding balance successfully paid via GCash!');
          setTab('paymenthistory');
          setTimeout(() => setOrderSuccess(''), 5000);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return;
      }
      
      const order = orders.find(o => o.id === orderId);
      if (order) {
        if (!order.paid) {
          setOrders(orders.map(o => o.id === orderId ? { ...o, paid: true, paidDate: Date.now() } : o));
          setCustomers(customers.map(c => c.id === order.customerId ? { ...c, unpaid: Math.max(0, c.unpaid - order.total) } : c));
          setOrderSuccess(\`✅ Payment successful via PayMongo! Order \${orderId} is now paid.\`);
          setTab('myorders');
          setTimeout(() => setOrderSuccess(''), 5000);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (orders.length > 0) {
        // If orders are loaded but order is not found, we still clean up the URL to avoid looping or getting stuck
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [orders, customers, setOrders, setCustomers]);`
);
fs.writeFileSync('src/pages/customer/CustomerPortal.tsx', s);
