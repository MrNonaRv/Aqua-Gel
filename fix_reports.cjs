const fs = require('fs');
let s = fs.readFileSync('src/pages/admin/Reports.tsx', 'utf8');

// Add subFilter to state
s = s.replace(
  "import { useState } from 'react';",
  "import { useState, useEffect } from 'react';"
);

s = s.replace(
  "const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');",
  "const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');\n  const [subFilter, setSubFilter] = useState<{name: string, start: number, end: number} | null>(null);\n\n  useEffect(() => {\n    setSubFilter(null);\n  }, [period]);"
);

// Switch variable names for calculation
s = s.replace(
  "const periodOrders = orders.filter(o => o.date >= start);\n  const paid = periodOrders.filter(o => o.paid);\n  const unpaid = periodOrders.filter(o => !o.paid);\n  \n  const income = paid.reduce((s, o) => s + o.total, 0);\n  const outstanding = unpaid.reduce((s, o) => s + o.total, 0);\n  const slimSold = paid.filter(o => o.type === 'slim').reduce((s, o) => s + o.qty, 0);\n  const roundSold = paid.filter(o => o.type === 'round').reduce((s, o) => s + o.qty, 0);",
  "const basePeriodOrders = orders.filter(o => o.date >= start);\n  const basePaid = basePeriodOrders.filter(o => o.paid);"
);

// Now update all `paid` references in chart to `basePaid`
s = s.replace(/const total = paid\.filter/g, "const total = basePaid.filter");

// Daily chart
s = s.replace(
  "return {\n        name: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,\n        total\n      };",
  "return {\n        name: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,\n        total,\n        startMs: hs.getTime(),\n        endMs: he.getTime()\n      };"
);

// Weekly chart
s = s.replace(
  "return { \n        name: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }), \n        total \n      };",
  "return { \n        name: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }), \n        total,\n        startMs: ds.getTime(),\n        endMs: de.getTime()\n      };"
);

// Monthly chart
s = s.replace(
  "return { name: `Week ${i+1}`, total };",
  "return { name: `Week ${i+1}`, total, startMs: ws, endMs: we - 1 };"
);

// Yearly chart
s = s.replace(
  "return { name: m, total };",
  "return { name: m, total, startMs: ms, endMs: me - 1 };"
);

// Re-add final stats calculation
s = s.replace(
  "const periodLabels = { daily: 'Today', weekly: 'Last 7 Days', monthly: 'This Month', yearly: 'This Year' };",
  `let finalOrders = basePeriodOrders;
  if (subFilter) {
    finalOrders = finalOrders.filter(o => o.date >= subFilter.start && o.date <= subFilter.end);
  }

  const paid = finalOrders.filter(o => o.paid);
  const unpaid = finalOrders.filter(o => !o.paid);
  
  const income = paid.reduce((s, o) => s + o.total, 0);
  const outstanding = unpaid.reduce((s, o) => s + o.total, 0);
  const slimSold = paid.filter(o => o.type === 'slim').reduce((s, o) => s + o.qty, 0);
  const roundSold = paid.filter(o => o.type === 'round').reduce((s, o) => s + o.qty, 0);
  
  const periodLabels = { daily: 'Today', weekly: 'Last 7 Days', monthly: 'This Month', yearly: 'This Year' };`
);

// Add interaction on BarChart
s = s.replace(
  "<Bar dataKey=\"total\" fill=\"#0a6ed1\" radius={[6, 6, 0, 0]} maxBarSize={60} />",
  "<Bar \n                dataKey=\"total\" \n                fill=\"#0a6ed1\" \n                radius={[6, 6, 0, 0]} \n                maxBarSize={60} \n                cursor=\"pointer\"\n                onClick={(data) => {\n                  if (data && data.payload) {\n                    if (subFilter?.name === data.payload.name) {\n                      setSubFilter(null);\n                    } else {\n                      setSubFilter({ name: data.payload.name, start: data.payload.startMs, end: data.payload.endMs });\n                    }\n                  }\n                }}\n              />"
);

s = s.replace(
  "{(period === 'daily' || period === 'weekly') && (",
  "{(period === 'daily' || period === 'weekly' || subFilter) && ("
);

s = s.replace(
  "Total Income {periodLabels[period]}",
  "Total Income {subFilter ? subFilter.name : periodLabels[period]}"
);

s = s.replace(
  "Track sales performance across different time periods",
  "Track sales performance across different time periods. Click on a bar in the chart to filter metrics for that specific period."
);

fs.writeFileSync('src/pages/admin/Reports.tsx', s);
