const fs = require('fs');

const now = new Date();
const orders = [
  { id: 1, paid: true, date: new Date(now.getFullYear(), now.getMonth(), 5).getTime(), total: 100 },
  { id: 2, paid: true, date: new Date(now.getFullYear(), now.getMonth(), 10).getTime(), total: 100 },
];

let start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const basePeriodOrders = orders.filter(o => o.date >= start);
const basePaid = basePeriodOrders.filter(o => o.paid);

const weeks = [1, 8, 15, 22, 29];
const chartData = weeks.map((w, i) => {
  const ws = new Date(now.getFullYear(), now.getMonth(), w).getTime();
  const we = new Date(now.getFullYear(), now.getMonth(), weeks[i+1] || 32).getTime();
  const total = basePaid.filter(o => o.date >= ws && o.date < we).reduce((s, o) => s + o.total, 0);
  return { name: `Week ${i+1}`, total, startMs: ws, endMs: we - 1 };
});

console.log("Base paid length:", basePaid.length);
console.log("Chart total:", chartData.reduce((s, c) => s + c.total, 0));
console.log("Chart data:", chartData);
