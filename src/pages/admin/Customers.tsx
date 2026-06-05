import { useState } from 'react';
import { useStore, Customer } from '../../lib/store';
import { Search, MapPin, Phone, User as UserIcon } from 'lucide-react';

export default function Customers() {
  const { customers, setCustomers, orders } = useStore();
  const [search, setSearch] = useState('');
  const [filterLoyal, setFilterLoyal] = useState(false);
  const [filterUnpaid, setFilterUnpaid] = useState(false);

  const [viewCust, setViewCust] = useState<Customer | null>(null);
  const [adjAmount, setAdjAmount] = useState('');

  const filtered = customers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLoyal && !c.isLoyal) return false;
    if (filterUnpaid && c.unpaid <= 0) return false;
    return true;
  });

  const handleAdjustBalance = () => {
    if (!viewCust) return;
    const amt = parseFloat(adjAmount);
    if (isNaN(amt)) return;
    setCustomers(customers.map(c => c.id === viewCust.id ? { ...c, unpaid: Math.max(0, amt) } : c));
    setViewCust(null);
    setAdjAmount('');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-1">Customers</h1>
        <p className="text-brand-gray">Manage customer records and track balances</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
          <input 
            type="text" 
            className="form-control pl-9 w-full" 
            placeholder="Search customer name..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={filterLoyal} onChange={e => setFilterLoyal(e.target.checked)} className="rounded border-brand-border text-brand-blue focus:ring-brand-blue" />
          Show Loyal/Regular Only
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={filterUnpaid} onChange={e => setFilterUnpaid(e.target.checked)} className="rounded border-brand-border text-brand-blue focus:ring-brand-blue" />
          With Unpaid Balance
        </label>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-container">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Username</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Unpaid Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center font-bold text-sm shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-1">{c.name} {c.isLoyal && <span className="text-yellow-500" title="Loyal Customer">⭐</span>}</div>
                        {c.isLoyal ? (
                          <span className="badge badge-loyal text-[10px] mt-0.5">Loyal</span>
                        ) : (
                          <div className="text-[10px] text-brand-gray mt-0.5">{c.totalGallons} / 50 gallons</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-brand-gray">@{c.username}</td>
                  <td>{c.phone || '—'}</td>
                  <td className="text-brand-gray text-xs max-w-[200px] truncate" title={c.address}>{c.address}</td>
                  <td><strong className={c.unpaid > 0 ? 'text-brand-red' : 'text-brand-green'}>₱{c.unpaid}</strong></td>
                  <td>
                    <span className={`badge ${c.isLoyal ? 'badge-loyal' : 'badge-delivered'}`}>
                      {c.isLoyal ? 'Regular' : 'Standard'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewCust(c)}>View</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-brand-gray">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewCust && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-xl font-bold flex items-center gap-2">
                <UserIcon size={20} className="text-brand-blue" />
                {viewCust.name}
              </h3>
              <button className="text-xl text-brand-gray hover:text-brand-dark" onClick={() => { setViewCust(null); setAdjAmount(''); }}>×</button>
            </div>

            {(() => {
              const custOrders = orders.filter(o => o.customerId === viewCust.id).sort((a,b) => b.date - a.date);
              const totalSpent = custOrders.filter(o => o.paid).reduce((s,o) => s + o.total, 0);

              return (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-brand-gray-light rounded-xl p-4">
                      <div className="text-xs text-brand-gray mb-1">Total Spent</div>
                      <div className="font-heading text-2xl font-bold text-brand-green">₱{totalSpent}</div>
                    </div>
                    <div className="bg-brand-gray-light rounded-xl p-4">
                      <div className="text-xs text-brand-gray mb-1">Unpaid Balance</div>
                      <div className={`font-heading text-2xl font-bold ${viewCust.unpaid > 0 ? 'text-brand-red' : 'text-brand-dark'}`}>
                        ₱{viewCust.unpaid}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-brand-gray mb-6">
                    <div className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> {viewCust.address}</div>
                    <div className="flex items-center gap-2"><Phone size={16} className="shrink-0" /> {viewCust.phone || 'N/A'}</div>
                  </div>

                  <div className="font-bold mb-3 flex justify-between items-end">
                    <span>Order History</span>
                    <span className="text-xs font-normal text-brand-gray">{custOrders.length} orders</span>
                  </div>
                  
                  <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
                    {custOrders.slice(0,6).map(o => (
                      <div key={o.id} className="flex justify-between items-center py-2 border-b border-[#f0f3f8] text-sm">
                        <div>
                          <div className="font-medium">{o.type==='slim'?'🔵 Slim':'🟢 Round'} ×{o.qty} — {o.method==='delivery'?'🚚 Delivery':'🏪 Pick-up'}</div>
                          <div className="text-xs text-brand-gray mt-0.5">{new Date(o.date).toLocaleDateString('en-PH')}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold mb-0.5">₱{o.total}</div>
                          <span className={`badge text-[10px] ${o.paid ? 'badge-paid' : 'badge-unpaid'}`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                        </div>
                      </div>
                    ))}
                    {custOrders.length === 0 && <div className="text-sm text-brand-gray py-4 text-center">No order history available.</div>}
                  </div>

                  <div className="pt-4 border-t border-brand-border">
                    <label className="block text-sm font-medium mb-2">Adjust Unpaid Balance</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        className="form-control flex-1" 
                        placeholder="Amount (₱)" 
                        value={adjAmount}
                        onChange={e => setAdjAmount(e.target.value)}
                        min="0"
                      />
                      <button className="btn btn-primary whitespace-nowrap" onClick={handleAdjustBalance}>Update</button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
