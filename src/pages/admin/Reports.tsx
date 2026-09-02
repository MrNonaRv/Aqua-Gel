import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { orders } = useStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [subFilter, setSubFilter] = useState<{name: string, start: number, end: number} | null>(null);

  useEffect(() => {
    setSubFilter(null);
  }, [period]);

  const now = new Date();
  
  const getRange = (p: string) => {
    let start, end;
    if (p === 'daily') {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setHours(23, 59, 59, 999);
    } else if (p === 'weekly') {
      start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setHours(23, 59, 59, 999);
    } else if (p === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    return { start: start.getTime(), end: end.getTime() };
  };

  const { start, end } = getRange(period);
  const basePeriodOrders = orders.filter(o => o.date >= start && o.date <= end);
  const basePaid = basePeriodOrders.filter(o => o.paid);

  // Chart Data
  let chartData: any[] = [];
  let chartTitle = '';

  if (period === 'daily') {
    chartTitle = 'Income Today (by Hour)';
    const hours = Array.from({length: 24}, (_, i) => i);
    chartData = hours.map(h => {
      const hs = new Date(now); hs.setHours(h, 0, 0, 0);
      const he = new Date(now); he.setHours(h, 59, 59, 999);
      const total = basePaid.filter(o => o.date >= hs.getTime() && o.date <= he.getTime()).reduce((s, o) => s + o.total, 0);
      return {
        name: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,
        total,
        startMs: hs.getTime(),
        endMs: he.getTime()
      };
    });
  } else if (period === 'weekly') {
    chartTitle = 'Income by Day (Last 7 Days)';
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
  } else if (period === 'monthly') {
    chartTitle = 'Income by Week (This Month)';
    const weeks = [1, 8, 15, 22];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (daysInMonth > 28) weeks.push(29);

    chartData = weeks.map((w, i) => {
      const ws = new Date(now.getFullYear(), now.getMonth(), w).getTime();
      let weMs;
      if (i === weeks.length - 1) {
        weMs = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(); // 1st of next month
      } else {
        weMs = new Date(now.getFullYear(), now.getMonth(), weeks[i+1]).getTime();
      }
      
      const total = basePaid.filter(o => o.date >= ws && o.date < weMs).reduce((s, o) => s + o.total, 0);
      return { name: `Week ${i+1}`, total, startMs: ws, endMs: weMs - 1 };
    });
  } else {
    chartTitle = 'Income by Month (This Year)';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    chartData = months.map((m, i) => {
      const ms = new Date(now.getFullYear(), i, 1).getTime();
      const me = new Date(now.getFullYear(), i+1, 1).getTime();
      const total = basePaid.filter(o => o.date >= ms && o.date < me).reduce((s, o) => s + o.total, 0);
      return { name: m, total, startMs: ms, endMs: me - 1 };
    });
  }

  let finalOrders = basePeriodOrders;
  if (subFilter) {
    finalOrders = finalOrders.filter(o => o.date >= subFilter.start && o.date <= subFilter.end);
  }

  const paid = finalOrders.filter(o => o.paid);
  const unpaid = finalOrders.filter(o => !o.paid);
  
  const income = paid.reduce((s, o) => s + o.total, 0);
  const outstanding = unpaid.reduce((s, o) => s + o.total, 0);
  const slimSold = paid.filter(o => o.type === 'slim').reduce((s, o) => s + o.qty, 0);
  const roundSold = paid.filter(o => o.type === 'round').reduce((s, o) => s + o.qty, 0);
  
  // Calculate active customers for this period (customers who placed at least one order)
  const activeCustomersCount = new Set(finalOrders.map(o => o.customerId)).size;

  const periodLabels = { daily: 'Today', weekly: 'Last 7 Days', monthly: 'This Month', yearly: 'This Year' };

  return (
    <div className="max-w-6xl mx-auto print:max-w-full print:m-0 print:p-4">
      <div className="mb-6 flex justify-between items-end print:hidden">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">Income Reports</h1>
          <p className="text-brand-gray">Track sales performance across different time periods. Click on a bar in the chart to filter metrics for that specific period.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="btn btn-secondary border-brand-border bg-white shadow-sm flex items-center gap-2 font-bold"
        >
          🖨️ Export PDF
        </button>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="font-heading text-3xl font-bold mb-1">Aqua Gel - Comprehensive Report</h1>
        <p className="text-brand-gray text-sm">Report Period: {subFilter ? subFilter.name : periodLabels[period]} ({new Date().toLocaleString('en-PH')})</p>
      </div>

      {(period === 'daily' || period === 'weekly' || subFilter) && (
        <div className="bg-gradient-to-r from-brand-blue to-brand-teal text-white p-6 rounded-2xl mb-8 shadow-md print:bg-none print:bg-white print:border print:border-brand-border print:text-brand-dark">
          <div className="text-white/80 print:text-brand-gray font-medium mb-1 uppercase tracking-wider text-sm">Total Income {subFilter ? subFilter.name : periodLabels[period]}</div>
          <div className="font-heading text-4xl font-bold">₱{income.toLocaleString()}</div>
        </div>
      )}

      <div className="flex gap-2 mb-8 bg-brand-gray-light p-1 rounded-xl w-fit border border-brand-border print:hidden">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
          <button 
            key={p}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${period === p ? 'bg-white text-brand-blue shadow-sm' : 'text-brand-gray hover:text-brand-dark'}`}
            onClick={() => { setPeriod(p); setSubFilter(null); }}
          >
            {p}
          </button>
        ))}
      </div>

      {subFilter && (
        <div className="mb-4 flex items-center gap-3 print:hidden">
          <span className="text-sm text-brand-gray font-medium">Filtering by: <strong className="text-brand-blue">{subFilter.name}</strong></span>
          <button 
            onClick={() => setSubFilter(null)}
            className="text-xs bg-brand-gray-light hover:bg-brand-border text-brand-dark px-3 py-1 rounded-full transition-colors font-bold"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4">
        <div className="card !mb-0 p-6 print:border print:shadow-none">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Total Income</div>
          <div className="font-heading text-3xl lg:text-4xl font-bold text-brand-green mb-1">₱{income.toLocaleString()}</div>
          <div className="text-sm text-brand-gray font-medium">{paid.length} paid orders</div>
        </div>
        <div className="card !mb-0 p-6 print:border print:shadow-none">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Outstanding</div>
          <div className="font-heading text-3xl lg:text-4xl font-bold text-brand-red mb-1">₱{outstanding.toLocaleString()}</div>
          <div className="text-sm text-brand-gray font-medium">{unpaid.length} unpaid orders</div>
        </div>
        <div className="card !mb-0 p-6 print:border print:shadow-none">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Gallons Sold</div>
          <div className="font-heading text-3xl lg:text-4xl font-bold text-brand-dark mb-1">{slimSold + roundSold}</div>
          <div className="text-sm text-brand-gray font-medium flex gap-3">
            <span>🔵 {slimSold}</span>
            <span>🟢 {roundSold}</span>
          </div>
        </div>
        <div className="card !mb-0 p-6 print:border print:shadow-none">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Active Customers</div>
          <div className="font-heading text-3xl lg:text-4xl font-bold text-brand-blue mb-1">{activeCustomersCount}</div>
          <div className="text-sm text-brand-gray font-medium">Placed orders</div>
        </div>
      </div>

      <div className="card mb-8 print:hidden">
        <div className="card-title mb-6">{chartTitle}</div>
        <div className="h-80 w-full text-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} dy={10} tick={{ fill: '#6B7280' }} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={v => `₱${v}`} dx={-10} tick={{ fill: '#6B7280' }} />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Total Income']}
              />
              <Bar 
                dataKey="total" 
                fill="#0a6ed1" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={60} 
                cursor="pointer"
                onClick={(data) => {
                  if (data && data.payload) {
                    if (subFilter?.name === data.payload.name) {
                      setSubFilter(null);
                    } else {
                      setSubFilter({ name: data.payload.name, start: data.payload.startMs, end: data.payload.endMs });
                    }
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card print:shadow-none print:border-none print:p-0">
        <div className="card-header border-b border-brand-border pb-4 mb-4">
          <div>
            <h2 className="card-title print:text-2xl">Transaction Log</h2>
            <div className="text-sm text-brand-gray mt-1">Detailed view of all transactions with exact date and time.</div>
          </div>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="table-container print:w-full print:text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {finalOrders.length > 0 ? [...finalOrders].sort((a,b)=>b.date - a.date).map(o => (
                <tr key={o.id}>
                  <td className="text-xs text-brand-gray">
                    {new Date(o.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="font-bold">{o.customerName}</td>
                  <td>{o.type === 'slim' ? '🔵 Slim' : '🟢 Round'}</td>
                  <td>{o.qty}</td>
                  <td>{o.method === 'delivery' ? '🚚 Delivery' : '🏪 Pick-up'}</td>
                  <td className="font-bold">₱{o.total}</td>
                  <td><span className={`badge ${o.paid ? 'badge-paid' : 'badge-unpaid'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-brand-gray">No transactions in this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
