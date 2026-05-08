import { useStore } from '../../lib/store';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { orders, customers, inventory } = useStore();

  const todayStart = new Date(); 
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => o.date >= todayStart.getTime());
  const todayIncome = todayOrders.filter(o => o.paid).reduce((s, o) => s + o.total, 0);
  const totalUnpaid = customers.reduce((s, c) => s + c.unpaid, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  
  const recentOrders = [...orders].sort((a, b) => b.date - a.date).slice(0, 5);
  const unpaidCustomers = customers.filter(c => c.unpaid > 0);

  const maxSlim = 100;
  const maxRound = 80;
  const slimPct = Math.min(100, (inventory.slim / maxSlim) * 100);
  const roundPct = Math.min(100, (inventory.round / maxRound) * 100);

  const todayStr = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-brand-gray">{todayStr}</p>
      </div>

      <motion.div 
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-5 rounded-2xl border border-brand-border hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Today's Income</div>
          <div className="font-heading text-3xl font-bold text-brand-green mb-1">₱{todayIncome.toLocaleString()}</div>
          <div className="text-xs text-brand-gray">{todayOrders.length} orders today</div>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-5 rounded-2xl border border-brand-border hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Pending Orders</div>
          <div className="font-heading text-3xl font-bold text-brand-amber mb-1">{pendingOrders}</div>
          <div className="text-xs text-brand-gray">Awaiting processing</div>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-5 rounded-2xl border border-brand-border hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Total Unpaid</div>
          <div className="font-heading text-3xl font-bold text-brand-red mb-1">₱{totalUnpaid.toLocaleString()}</div>
          <div className="text-xs text-brand-gray">{unpaidCustomers.length} customers</div>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-5 rounded-2xl border border-brand-border hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-brand-gray uppercase tracking-wider mb-2">Total Customers</div>
          <div className="font-heading text-3xl font-bold text-brand-dark mb-1">{customers.length}</div>
          <div className="text-xs text-brand-gray">{customers.filter(c => c.isLoyal).length} loyal/regular</div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-brand-border flex flex-col">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark">View all →</Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="table-container">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className="font-medium">{o.customerName}</td>
                    <td>{o.type === 'slim' ? '🔵 Slim' : '🟢 Round'} × {o.qty}</td>
                    <td>
                      <span className={`badge ${o.status === 'Pending' ? 'badge-pending' : o.status === 'Out for Delivery' ? 'badge-delivery' : 'badge-delivered'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-brand-dark">₱{o.total}</div>
                      <div className="mt-1">
                        <span className={`badge text-[10px] ${o.paid ? 'badge-paid' : 'badge-unpaid'}`}>
                          {o.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-brand-gray">No recent orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Status */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-lg font-bold">Inventory Status</h2>
            <Link to="/admin/inventory" className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark">Manage →</Link>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🔵</span>
                  <span className="font-medium text-sm">Slim Gallons</span>
                </div>
                <div className="h-2 bg-brand-gray-light rounded-full overflow-hidden mr-6">
                  <div className={`h-full rounded-full transition-all ${inventory.slim < 10 ? 'bg-brand-red' : inventory.slim < 20 ? 'bg-brand-amber' : 'bg-brand-blue'}`} style={{ width: `${slimPct}%` }} />
                </div>
              </div>
              <div className={`font-heading text-2xl font-bold ${inventory.slim < 10 ? 'text-brand-red' : 'text-brand-dark'}`}>
                {inventory.slim}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🟢</span>
                  <span className="font-medium text-sm">Round Gallons</span>
                </div>
                <div className="h-2 bg-brand-gray-light rounded-full overflow-hidden mr-6">
                  <div className={`h-full rounded-full transition-all ${inventory.round < 10 ? 'bg-brand-red' : inventory.round < 20 ? 'bg-brand-amber' : 'bg-brand-blue'}`} style={{ width: `${roundPct}%` }} />
                </div>
              </div>
              <div className={`font-heading text-2xl font-bold ${inventory.round < 10 ? 'text-brand-red' : 'text-brand-dark'}`}>
                {inventory.round}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-brand-border">
            <h3 className="font-heading text-base font-bold mb-4">Pricing</h3>
            <div className="flex gap-8">
              <div>
                <div className="text-xs text-brand-gray mb-1">Slim Gallon</div>
                <div className="font-bold text-xl text-brand-blue">₱{inventory.priceSlim}</div>
              </div>
              <div>
                <div className="text-xs text-brand-gray mb-1">Round Gallon</div>
                <div className="font-bold text-xl text-brand-teal">₱{inventory.priceRound}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
        <div className="p-6 border-b border-brand-border">
          <h2 className="font-heading text-lg font-bold">Customers with Unpaid Balances</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table-container">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Unpaid Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {unpaidCustomers.length > 0 ? unpaidCustomers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.name}</div>
                    {c.isLoyal && <span className="badge badge-loyal text-[10px] mt-1">Loyal</span>}
                  </td>
                  <td className="text-brand-gray">{c.phone || '—'}</td>
                  <td className="text-brand-gray text-sm">{c.address}</td>
                  <td className="font-bold text-brand-red">₱{c.unpaid}</td>
                  <td><span className="badge badge-unpaid">Unpaid</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-brand-gray text-sm">No unpaid balances 🎉</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
