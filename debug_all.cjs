const fs = require('fs');

// We need to simulate Reports.tsx logic
// First let's extract the orders from localStorage if possible... wait, we are in node, no localStorage.
// Let's use the SEED_ORDERS but with the shift logic applied, since the user has that.
const now = new Date();
const SEED_ORDERS = [
  { id: 'o1', paid: true, date: now.getTime() - 2*86400000, total: 80 },
  { id: 'o2', paid: true, date: now.getTime() - 86400000, total: 35 },
  { id: 'o3', paid: false, date: now.getTime() - 3600000, total: 70 },
  { id: 'o4', paid: false, date: now.getTime() - 1800000, total: 120 },
  { id: 'o5', paid: true, date: now.getTime() - 5*86400000, total: 80 },
  { id: 'o6', paid: false, date: now.getTime() - 7*86400000, total: 105 },
];

let orders = SEED_ORDERS;
const startMonthly = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const baseMonthly = orders.filter(o => o.date >= startMonthly);
const basePaidMonthly = baseMonthly.filter(o => o.paid);

let chartData = [];
const weeks = [1, 8, 15, 22, 29];
chartData = weeks.map((w, i) => {
  const ws = new Date(now.getFullYear(), now.getMonth(), w).getTime();
  const we = new Date(now.getFullYear(), now.getMonth(), weeks[i+1] || 32).getTime();
  const total = basePaidMonthly.filter(o => o.date >= ws && o.date < we).reduce((s, o) => s + o.total, 0);
  return { name: `Week ${i+1}`, total, startMs: ws, endMs: we - 1 };
});

console.log("Start Monthly:", new Date(startMonthly));
console.log("Chart Data:", chartData);
console.log("Total from chart:", chartData.reduce((s, c) => s + c.total, 0));
console.log("Total from basePaid:", basePaidMonthly.reduce((s, o) => s + o.total, 0));

