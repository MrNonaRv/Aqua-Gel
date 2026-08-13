const now = Date.now();
const SEED_ORDERS = [
  { id: 'o1', paid: true, date: now - 2*86400000, total: 80 },
  { id: 'o2', paid: true, date: now - 86400000, total: 35 },
  { id: 'o3', paid: false, date: now - 3600000, total: 70 },
  { id: 'o4', paid: false, date: now - 1800000, total: 120 },
  { id: 'o5', paid: true, date: now - 5*86400000, total: 80 },
  { id: 'o6', paid: false, date: now - 7*86400000, total: 105 },
];

const maxDate = Math.max(...SEED_ORDERS.map(o => o.date));
const diff = now - maxDate;

const updated = SEED_ORDERS.map(o => ({...o, date: o.date + diff}));
console.log("Max date was:", new Date(maxDate));
console.log("Diff:", diff);
console.log("Now:", new Date(now));
console.log("Updated dates:", updated.map(o => new Date(o.date)));
