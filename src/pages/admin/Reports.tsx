import { useState } from 'react';
import { useStore } from '../../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { orders } = useStore();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const now = new Date();
  
  const getRange = (p: string) => {
    let start;
    if (p === 'weekly') {
      start = new Date(now); 
      start.setDate(now.getDate() - 6); 
      start.setHours(0, 0, 0, 0);
    } else if (p === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return start.getTime();
  };

  const start = getRange(period);
  const periodOrders = orders.filter(o => o.date >= start);
  const paid = periodOrders.filter(o => o.paid);
  const unpaid = periodOrders.filter(o => !o.paid);
  
  const income = paid.reduce((s, o) => s + o.total, 0);
  const outstanding = unpaid.reduce((s, o) => s + o.total, 0);
  const slimSold = paid.filter(o => o.type === 'slim').reduce((s, o) => s + o.qty, 0);
  const roundSold = paid.filter(o => o.type === 'round').reduce((s, o) => s + o.qty, 0);

  // Chart Data
  let chartData: any[] = [];
  let chartTitle = '';

  if (period === 'weekly') {
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
      const total = paid.filter(o => o.date >= ds.getTime() && o.date <= de.getTime()).reduce((s, o) => s + o.total, 0);
      return { 
        name: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }), 
        total 
      };
    });
  } else if (period === 'monthly') {
    chartTitle = 'Income by Week (This Month)';
    const weeks = [1, 8, 15, 22, 29];
    chartData = weeks.map((w, i) => {
      const ws = new Date(now.getFullYear(), now.getMonth(), w).getTime();
      const we = new Date(now.getFullYear(), now.getMonth(), weeks[i+1] || 32).getTime();
      const total = paid.filter(o => o.date >= ws && o.date < we).reduce((s, o) => s + o.total, 0);
      return { name: `Week ${i+1}`, total };
    });
  } else {
    chartTitle = 'Income by Month (This Year)';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    chartData = months.map((m, i) => {
      const ms = new Date(now.getFullYear(), i, 1).getTime();
      const me = new Date(now.getFullYear(), i+1, 1).getTime();
      const total = paid.filter(o => o.date >= ms && o.date < me).reduce((s, o) => s + o.total, 0);
      return { name: m, total };
    });
  }

  const periodLabels = { weekly: 'Last 7 Days', monthly: 'This Month', yearly: 'This Year' };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold mb-1">Income Reports</h1>
        <p className="text-brand-gray">Track sales performance across different time periods</p>
      </div>

      <div className="flex gap-2 mb-8 bg-brand-gray-light p-1 rounded-xl w-fit border border-brand-border">
        {(['weekly', 'monthly', 'yearly'] as const).map(p => (
          <button 
            key={p}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${period === p ? 'bg-white text-brand-blue shadow-sm' : 'text-brand-gray hover:text-brand-dark'}`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card !mb-0 p-6">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Total Income</div>
          <div className="font-heading text-4xl font-bold text-brand-green mb-1">₱{income.toLocaleString()}</div>
          <div className="text-sm text-brand-gray font-medium">{paid.length} paid orders</div>
        </div>
        <div className="card !mb-0 p-6">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Outstanding</div>
          <div className="font-heading text-4xl font-bold text-brand-red mb-1">₱{outstanding.toLocaleString()}</div>
          <div className="text-sm text-brand-gray font-medium">{unpaid.length} unpaid orders</div>
        </div>
        <div className="card !mb-0 p-6">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Gallons Sold</div>
          <div className="font-heading text-4xl font-bold text-brand-dark mb-1">{slimSold + roundSold}</div>
          <div className="text-sm text-brand-gray font-medium flex gap-3">
            <span>🔵 {slimSold} slim</span>
            <span>🟢 {roundSold} round</span>
          </div>
        </div>
      </div>

      <div className="card mb-8">
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
              <Bar dataKey="total" fill="#0a6ed1" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b border-brand-border pb-4 mb-4">
          <div>
            <h2 className="card-title">Transaction Log</h2>
            <div className="text-sm text-brand-gray mt-1">{periodLabels[period]}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-container">
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
              {periodOrders.length > 0 ? periodOrders.sort((a,b)=>b.date - a.date).map(o => (
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
