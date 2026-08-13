const fs = require('fs');

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
console.log("Monthly Start:", new Date(start));
console.log("Monthly End:", new Date(end));

const weeks = [1, 8, 15, 22, 29];
let maxEnd = 0;
const chartData = weeks.map((w, i) => {
  const ws = new Date(now.getFullYear(), now.getMonth(), w).getTime();
  const we = new Date(now.getFullYear(), now.getMonth(), weeks[i+1] || 32).getTime();
  if (we - 1 > maxEnd) maxEnd = we - 1;
  return { name: `Week ${i+1}`, startMs: new Date(ws), endMs: new Date(we - 1) };
});

console.log("Chart Max End:", new Date(maxEnd));
