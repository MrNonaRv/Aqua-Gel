const now = new Date();
const orders = [
  { paid: true, date: Date.now() - 3600000, total: 100 },
  { paid: true, date: Date.now() - 100000, total: 100 },
];
let start = new Date(now);
start.setDate(now.getDate() - 6);
start.setHours(0, 0, 0, 0);
start = start.getTime();

const basePeriodOrders = orders.filter(o => o.date >= start);
const basePaid = basePeriodOrders.filter(o => o.paid);

let chartData = [];
const labels = [];
for (let i = 6; i >= 0; i--) { 
  const d = new Date(now); 
  d.setDate(d.getDate() - i); 
  labels.push(d); 
}
chartData = labels.map(d => {
  const ds = new Date(d); ds.setHours(0, 0, 0, 0);
  const de = new Date(d); de.setHours(23, 59, 59, 999);
  const total = basePaid.filter(o => o.date >= ds.getTime() && o.date <= de.getTime()).reduce((s, o) => s + o.total, 0);
  return { 
    name: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }), 
    total,
    startMs: ds.getTime(),
    endMs: de.getTime()
  };
});

console.log(chartData);
