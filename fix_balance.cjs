const fs = require('fs');

let f = 'src/pages/admin/Customers.tsx';
let s = fs.readFileSync(f, 'utf8');

// Replace function definition
s = s.replace(
  /const handleAdjustBalance = \(\) => \{\s+if \(\!viewCust\) return;\s+const amt = parseFloat\(adjAmount\);\s+if \(isNaN\(amt\)\) return;\s+setCustomers\(customers\.map\(c => c\.id === viewCust\.id \? \{ \.\.\.c, unpaid: Math\.max\(0, amt\) \} : c\)\);\s+setViewCust\(null\);\s+setAdjAmount\(''\);\s+\};/,
  `const handleRecordPayment = () => {
    if (!viewCust) return;
    const amt = parseFloat(adjAmount);
    if (isNaN(amt)) return;
    setCustomers(customers.map(c => c.id === viewCust.id ? { ...c, unpaid: Math.max(0, c.unpaid - amt) } : c));
    setViewCust(null);
    setAdjAmount('');
  };`
);

// Replace UI text
s = s.replace('<label className="block text-sm font-medium mb-2">Adjust Unpaid Balance</label>', '<label className="block text-sm font-medium mb-2">Record Payment</label>');
s = s.replace('placeholder="Amount (₱)"', 'placeholder="Payment Amount (₱)"');
s = s.replace('onClick={handleAdjustBalance}>Update</button>', 'onClick={handleRecordPayment}>Apply Payment</button>');

fs.writeFileSync(f, s);
