import { useState } from 'react';
import { useStore, Order, Customer } from '../../lib/store';
import { notifyStatusChange } from '../../lib/notifications';

export default function Orders() {
  const { orders, setOrders, personnel, updateCustomerBalance, customers, setCustomers, inventory } = useStore();
  const [statusF, setStatusF] = useState('');
  const [paidF, setPaidF] = useState('');
  const [methodF, setMethodF] = useState('');
  const [searchF, setSearchF] = useState('');

  const [editOrder, setEditOrder] = useState<Order | null>(null);
  
  // Edited values
  const [eStatus, setEStatus] = useState<Order['status']>('Pending');
  const [ePersonnel, setEPersonnel] = useState<string>('');
  const [ePaid, setEPaid] = useState<boolean>(false);
  const [ePaidDate, setEPaidDate] = useState<string>('');
  const [eReturn, setEReturn] = useState<boolean>(false);

  // Walk-in order states
  const [showAddWalkIn, setShowAddWalkIn] = useState(false);
  const [walkInCustomerId, setWalkInCustomerId] = useState('guest');
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInType, setWalkInType] = useState<'slim' | 'round'>('slim');
  const [walkInQty, setWalkInQty] = useState(1);
  const [walkInPaid, setWalkInPaid] = useState(true);
  const [walkInPaidDate, setWalkInPaidDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const handleOpenWalkIn = () => {
    setWalkInCustomerId('guest');
    setWalkInGuestName('');
    setWalkInType('slim');
    setWalkInQty(1);
    setWalkInPaid(true);
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setWalkInPaidDate(`${yyyy}-${mm}-${dd}`);
    
    setShowAddWalkIn(true);
  };

  const handleAddWalkIn = () => {
    let customerName = '';
    let customerId = '';
    const price = walkInType === 'slim' ? inventory.priceSlim : inventory.priceRound;
    const total = walkInQty * price;

    if (walkInCustomerId === 'guest') {
      if (!walkInGuestName.trim()) return;
      customerName = walkInGuestName.trim();
      customerId = 'guest_' + Date.now();
      
      const newGuestCustomer: Customer = {
        id: customerId,
        name: customerName,
        username: 'guest_' + Date.now(),
        phone: '',
        address: 'Walk-in Guest',
        unpaid: walkInPaid ? 0 : total,
        totalGallons: walkInQty,
        isLoyal: false,
        role: 'customer'
      };
      setCustomers([...customers, newGuestCustomer]);
    } else {
      if (!walkInCustomerId) return;
      const customer = customers.find(c => c.id === walkInCustomerId);
      if (!customer) return;
      customerName = customer.name;
      customerId = walkInCustomerId;
    }

    const newOrder: Order = {
      id: 'o' + Date.now(),
      customerId: customerId,
      customerName: customerName,
      type: walkInType,
      qty: walkInQty,
      method: 'pickup',
      paymentMethod: 'cash',
      status: 'Delivered', // Walk-in is processed instantly
      total: total,
      paid: walkInPaid,
      paidDate: walkInPaid ? new Date(walkInPaidDate).getTime() : undefined,
      date: Date.now(),
      personnel: null,
      address: null,
      containerReturn: false,
    };

    setOrders([newOrder, ...orders]);

    if (walkInCustomerId !== 'guest' && !walkInPaid) {
      updateCustomerBalance(customerId, total);
    }

    setShowAddWalkIn(false);
  };

  const filtered = orders.filter(o => {
    if (statusF && o.status !== statusF) return false;
    if (paidF === 'paid' && !o.paid) return false;
    if (paidF === 'unpaid' && o.paid) return false;
    if (methodF && o.method !== methodF) return false;
    if (searchF && !o.customerName.toLowerCase().includes(searchF.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.date - a.date);

  const handleEdit = (o: Order) => {
    setEditOrder(o);
    setEStatus(o.status);
    setEPersonnel(o.personnel || '');
    setEPaid(o.paid);
    setEReturn(o.containerReturn);
    
    const dateToUse = o.paidDate ? new Date(o.paidDate) : new Date();
    const yyyy = dateToUse.getFullYear();
    const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const dd = String(dateToUse.getDate()).padStart(2, '0');
    setEPaidDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveEdit = () => {
    if (!editOrder) return;
    
    const wasPaid = editOrder.paid;
    const parsedPaidDate = ePaid ? new Date(ePaidDate).getTime() : undefined;

    const updated = orders.map(o => {
      if (o.id === editOrder.id) {
        return {
          ...o,
          status: eStatus,
          personnel: ePersonnel || null,
          paid: ePaid,
          paidDate: parsedPaidDate,
          containerReturn: eReturn
        };
      }
      return o;
    });

    if (!wasPaid && ePaid) {
      updateCustomerBalance(editOrder.customerId, -editOrder.total);
    } else if (wasPaid && !ePaid) {
      updateCustomerBalance(editOrder.customerId, editOrder.total);
    }

    setOrders(updated);
    
    if (editOrder.status !== eStatus) {
      notifyStatusChange(editOrder.customerId, editOrder.id, eStatus);
    }
    
    setEditOrder(null);
  };

  const markPaid = (order: Order) => {
    if (order.paid) return;
    const updated = orders.map(o => o.id === order.id ? { ...o, paid: true, paidDate: Date.now() } : o);
    updateCustomerBalance(order.customerId, -order.total);
    setOrders(updated);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">Orders</h1>
          <p className="text-brand-gray">Manage all customer orders and refill transactions</p>
        </div>
        <button
          onClick={handleOpenWalkIn}
          className="btn btn-primary bg-brand-blue border-brand-blue text-white px-5 py-2.5 rounded-full hover:bg-brand-blue-dark flex items-center gap-1.5 font-bold shadow-md hover:shadow-lg transition-all"
        >
          Add <span className="text-lg">⊕</span>
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-6">
          <select className="form-control w-auto py-2 px-3 text-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select className="form-control w-auto py-2 px-3 text-sm" value={paidF} onChange={e => setPaidF(e.target.value)}>
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select className="form-control w-auto py-2 px-3 text-sm" value={methodF} onChange={e => setMethodF(e.target.value)}>
            <option value="">All Methods</option>
            <option value="delivery">Delivery</option>
            <option value="pickup">Pick-up</option>
          </select>
          <input 
            type="text" 
            className="form-control flex-1 min-w-[200px] py-2 px-3 text-sm" 
            placeholder="Search customer..." 
            value={searchF} 
            onChange={e => setSearchF(e.target.value)} 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="table-container">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Gallon Type</th>
                <th>Qty</th>
                <th>Method</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(o => (
                <tr key={o.id}>
                  <td className="text-xs text-brand-gray">
                    {new Date(o.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="font-bold">{o.customerName}</td>
                  <td>{o.type === 'slim' ? '🔵 Slim' : '🟢 Round'}</td>
                  <td>{o.qty}</td>
                  <td>{o.method === 'delivery' ? '🚚 Delivery' : '🏪 Pick-up'}</td>
                  <td className="font-bold text-brand-dark">₱{o.total}</td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <div>
                        <span className={`badge ${o.paid ? 'badge-paid' : 'badge-unpaid'} mr-2`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                        {o.paymentMethod && <span className="text-[10px] text-brand-gray font-semibold tracking-wider">{o.paymentMethod.toUpperCase()}</span>}
                      </div>
                      {o.paid && o.paidDate && (
                        <span className="text-[10.5px] text-brand-green font-bold mt-1">
                          Paid: {new Date(o.paidDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${o.status === 'Pending' ? 'badge-pending' : o.status === 'Out for Delivery' ? 'badge-delivery' : o.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'badge-delivered'}`}>{o.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(o)}>Edit</button>
                      {!o.paid && (
                        <button className="btn btn-sm bg-brand-green-light text-brand-green border border-brand-green/20 hover:bg-green-100 font-semibold" onClick={() => markPaid(o)}>Mark Paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="text-4xl mb-3 opacity-30">📦</div>
                    <div className="text-brand-dark font-medium mb-1">No orders found</div>
                    <div className="text-xs text-brand-gray">Try adjusting your filters or search query.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Walk in Order Modal */}
      {showAddWalkIn && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border-[2.5px] border-slate-900/85 p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 font-bold transition-all hover:bg-slate-100" 
              onClick={() => setShowAddWalkIn(false)}
            >
              ×
            </button>
            <h3 className="font-heading text-2xl font-black text-center mb-6 text-slate-800">Walk in Order</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">customer name</label>
                <div className="relative">
                  <select 
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                    value={walkInCustomerId} 
                    onChange={e => setWalkInCustomerId(e.target.value)}
                  >
                    <option value="guest">👤 Walk-in Guest (No Account)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {walkInCustomerId === 'guest' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Guest Full Name</label>
                  <input 
                    type="text"
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 shadow-xs"
                    placeholder="Enter guest name (e.g. B-boy Espinosa)"
                    value={walkInGuestName}
                    onChange={e => setWalkInGuestName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">gallon type</label>
                <div className="relative">
                  <select 
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                    value={walkInType} 
                    onChange={e => setWalkInType(e.target.value as any)}
                  >
                    <option value="slim">slim gallon</option>
                    <option value="round font-bold">round gallon</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-center">quantity</label>
                <div className="flex items-center justify-center gap-5 py-1">
                  <button
                    onClick={() => setWalkInQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full border-2 border-slate-850 text-slate-800 flex items-center justify-center font-black text-lg hover:bg-slate-100 transition-all select-none active:scale-90"
                    title="Decrease"
                  >
                    −
                  </button>
                  <span className="font-heading font-extrabold text-2xl text-slate-805 min-w-[20px] text-center">{walkInQty}</span>
                  <button
                    onClick={() => setWalkInQty(q => q + 1)}
                    className="w-9 h-9 rounded-full border-2 border-slate-850 text-slate-800 flex items-center justify-center font-black text-lg hover:bg-slate-100 transition-all select-none active:scale-90"
                    title="Increase"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Total</label>
                <div className="w-full rounded-full border-[2px] border-slate-300 py-3 text-center text-lg font-black text-slate-850 bg-slate-50 shadow-inner">
                  ₱{walkInQty * (walkInType === 'slim' ? inventory.priceSlim : inventory.priceRound)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Payment</label>
                <div className="relative">
                  <select 
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                    value={walkInPaid ? "paid" : "unpaid"} 
                    onChange={e => setWalkInPaid(e.target.value === "paid")}
                  >
                    <option value="paid">paid</option>
                    <option value="unpaid">unpaid</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {walkInPaid && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Payment Date / Date paid</label>
                  <input 
                    type="date"
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-810 bg-white outline-none focus:border-slate-800 shadow-xs"
                    value={walkInPaidDate}
                    onChange={e => setWalkInPaidDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="mt-8">
              <button 
                onClick={handleAddWalkIn}
                className="w-full rounded-full py-4 bg-[#bce4f4] hover:bg-[#a1daf2] text-[#05445e] font-black tracking-wider hover:shadow-md active:scale-95 transition-all duration-150"
              >
                add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border-[2.5px] border-slate-900/85 p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 font-bold transition-all hover:bg-slate-100" 
              onClick={() => setEditOrder(null)}
            >
              ×
            </button>
            <h3 className="font-heading text-2xl font-black text-center mb-6 text-slate-850">
              {editOrder.method === 'pickup' ? 'Edit walk in Order' : 'Edit Order'}
            </h3>
            
            <div className="space-y-4">
              {editOrder.method === 'delivery' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Order Status</label>
                    <div className="relative">
                      <select 
                        className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                        value={eStatus} 
                        onChange={e => setEStatus(e.target.value as any)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Delivery Personnel</label>
                    <div className="relative">
                      <select 
                        className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                        value={ePersonnel} 
                        onChange={e => setEPersonnel(e.target.value)}
                      >
                        <option value="">— None —</option>
                        {personnel.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Payment status</label>
                <div className="relative">
                  <select 
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-850 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                    value={ePaid ? "1" : "0"} 
                    onChange={e => setEPaid(e.target.value === "1")}
                  >
                    <option value="1">paid</option>
                    <option value="0">unpaid</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {ePaid && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Payment Date / Date paid</label>
                  <input 
                    type="date"
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-810 bg-white outline-none focus:border-slate-800 shadow-xs"
                    value={ePaidDate}
                    onChange={e => setEPaidDate(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Container return</label>
                <div className="relative">
                  <select 
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-850 bg-white outline-none focus:border-slate-850 appearance-none shadow-xs"
                    value={eReturn ? "1" : "0"} 
                    onChange={e => setEReturn(e.target.value === "1")}
                  >
                    <option value="0">not returned</option>
                    <option value="1">returned</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button 
                onClick={() => setEditOrder(null)}
                className="w-full rounded-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold tracking-wider transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="w-full rounded-full py-3 bg-[#bce4f4] hover:bg-[#a9d9ee] text-[#05445e] font-black tracking-wider hover:shadow-md transition-all"
              >
                save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
