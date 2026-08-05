const fs = require('fs');
let content = fs.readFileSync('src/pages/customer/CustomerPortal.tsx', 'utf8');

// Fix 1: Outstanding balance
content = content.replace(
  "const newWindow = window.open(data.checkoutUrl, '_blank');\n        if (!newWindow) {\n          alert('Popup blocked! Please allow popups to proceed to payment.');\n        } else {\n          setOrderSuccess('Payment window opened. Please complete your transaction securely.');\n        }",
  "window.location.href = data.checkoutUrl;"
);

// Fix 2: Place order
content = content.replace(
  "// PayMongo blocks iframe embedding, so we open in a new tab\n          const newWindow = window.open(data.checkoutUrl, '_blank');\n          if (!newWindow) {\n            alert('Popup blocked! Please click \"Complete Payment\" in your orders list to pay via GCash.');\n          } else {\n            setOrderSuccess('Payment window opened. Please complete your transaction securely.');\n          }",
  "window.location.href = data.checkoutUrl;"
);

fs.writeFileSync('src/pages/customer/CustomerPortal.tsx', content);
