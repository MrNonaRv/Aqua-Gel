import { useState, useEffect } from 'react';
import { useStore, Order, Customer } from '../../lib/store';
import { notifyStatusChange } from '../../lib/notifications';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/format';

export default function Orders() {
  const { orders, setOrders, personnel, updateCustomerBalance, customers, setCustomers, inventory, setInventory, subscriptions, setSubscriptions } = useStore();
  const [view, setView] = useState<'orders' | 'subscriptions'>('orders');

  useEffect(() => {
    // Notify admin about due subscriptions
    const dueSubscriptions = subscriptions.filter(s => s.active && s.nextDeliveryDate <= Date.now());
    if (dueSubscriptions.length > 0) {
      toast.warning('Subscriptions Due', {
        description: `There are ${dueSubscriptions.length} recurring subscriptions due for delivery today. Please trigger them.`,
        duration: 10000,
      });
    }
  }, [subscriptions.length]);
  const [statusF, setStatusF] = useState('');
  const [paidF, setPaidF] = useState('');
  const [methodF, setMethodF] = useState('');
  const [searchF, setSearchF] = useState('');

  // Date Filtering states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<'today' | 'yesterday' | '7days' | 'month' | 'custom' | ''>('');

  const applyQuickDateFilter = (filter: 'today' | 'yesterday' | '7days' | 'month' | 'clear') => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    if (filter === 'clear') {
      setDateFrom('');
      setDateTo('');
      setActiveDateFilter('');
      return;
    }

    if (filter === 'today') {
      const t = formatDate(today);
      setDateFrom(t);
      setDateTo(t);
      setActiveDateFilter('today');
    } else if (filter === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setDateFrom(yStr);
      setDateTo(yStr);
      setActiveDateFilter('yesterday');
    } else if (filter === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateFrom(formatDate(past));
      setDateTo(formatDate(today));
      setActiveDateFilter('7days');
    } else if (filter === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateFrom(formatDate(firstDay));
      setDateTo(formatDate(lastDay));
      setActiveDateFilter('month');
    }
  };

  const [viewNote, setViewNote] = useState<{customerName: string, text: string} | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  const getUnitPrice = (type: 'slim' | 'round') => {
    const now = Date.now();
    if (type === 'slim') {
      if (inventory.discountSlim && inventory.discountSlimValidUntil && inventory.discountSlimValidUntil >= now) {
        return inventory.discountSlim;
      }
      return inventory.priceSlim;
    } else {
      if (inventory.discountRound && inventory.discountRoundValidUntil && inventory.discountRoundValidUntil >= now) {
        return inventory.discountRound;
      }
      return inventory.priceRound;
    }
  };
  
  // Edited values
  const [eStatus, setEStatus] = useState<Order['status']>('Pending');
  const [ePersonnel, setEPersonnel] = useState<string>('');
  const [ePaid, setEPaid] = useState<boolean>(false);
  const [ePaidDate, setEPaidDate] = useState<string>('');
  const [eReturn, setEReturn] = useState<boolean>(false);
  const [eDiscountType, setEDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [eDiscountVal, setEDiscountVal] = useState<string>('');

  // Walk-in order states
  const [showAddWalkIn, setShowAddWalkIn] = useState(false);
  const [walkInCustomerId, setWalkInCustomerId] = useState('guest');
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInType, setWalkInType] = useState<'slim' | 'round'>('slim');
  const [walkInQty, setWalkInQty] = useState(1);
  const [walkInPaid, setWalkInPaid] = useState(true);
  const [walkInMethod, setWalkInMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [walkInAddress, setWalkInAddress] = useState('');
  const [walkInDiscountType, setWalkInDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [walkInDiscountVal, setWalkInDiscountVal] = useState<string>('');
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
    setWalkInMethod('pickup');
    setWalkInAddress('');
    setWalkInDiscountType('percentage');
    setWalkInDiscountVal('');
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setWalkInPaidDate(`${yyyy}-${mm}-${dd}`);
    
    setShowAddWalkIn(true);
  };

  const walkInUnitPrice = getUnitPrice(walkInType);
  const walkInSubtotal = walkInQty * walkInUnitPrice;
  const numWalkInDiscount = parseFloat(walkInDiscountVal) || 0;
  const walkInDiscountAmount = numWalkInDiscount > 0
    ? walkInDiscountType === 'percentage'
      ? walkInSubtotal * (numWalkInDiscount / 100)
      : Math.min(walkInSubtotal, numWalkInDiscount)
    : 0;
  const walkInFinalTotal = Number(Math.max(0, walkInSubtotal - walkInDiscountAmount).toFixed(2));

  const handleAddWalkIn = () => {
    let customerName = '';
    let customerId = '';
    const total = walkInFinalTotal;

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
      method: walkInMethod,
      paymentMethod: 'cash',
      status: walkInMethod === 'pickup' ? 'Delivered' : 'Pending',
      subtotal: Number(walkInSubtotal.toFixed(2)),
      discountType: numWalkInDiscount > 0 ? walkInDiscountType : undefined,
      discountValue: numWalkInDiscount > 0 ? numWalkInDiscount : undefined,
      discountAmount: numWalkInDiscount > 0 ? Number(walkInDiscountAmount.toFixed(2)) : undefined,
      total: total,
      paid: walkInPaid,
      paidDate: walkInPaid ? new Date(walkInPaidDate).getTime() : undefined,
      date: Date.now(),
      personnel: null,
      address: walkInMethod === 'delivery' ? walkInAddress : null,
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
    
    if (dateFrom) {
      const fromMs = new Date(dateFrom + 'T00:00:00').getTime();
      if (o.date < fromMs) return false;
    }
    if (dateTo) {
      const toMs = new Date(dateTo + 'T23:59:59.999').getTime();
      if (o.date > toMs) return false;
    }

    return true;
  }).sort((a, b) => b.date - a.date);

  const handleEdit = (o: Order) => {
    setEditOrder(o);
    setEStatus(o.status);
    setEPersonnel(o.personnel || '');
    setEPaid(o.paid);
    setEReturn(o.containerReturn);
    setEDiscountType(o.discountType || 'percentage');
    setEDiscountVal(o.discountValue !== undefined ? o.discountValue.toString() : '');
    
    const dateToUse = o.paidDate ? new Date(o.paidDate) : new Date();
    const yyyy = dateToUse.getFullYear();
    const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const dd = String(dateToUse.getDate()).padStart(2, '0');
    setEPaidDate(`${yyyy}-${mm}-${dd}`);
  };

  // Edit order live discount calculations
  const editUnitPrice = editOrder ? getUnitPrice(editOrder.type) : 0;
  const editSubtotal = editOrder ? (editOrder.subtotal || (editOrder.qty * editUnitPrice)) : 0;
  const numEditDiscount = parseFloat(eDiscountVal) || 0;
  const editDiscountAmount = numEditDiscount > 0
    ? eDiscountType === 'percentage'
      ? editSubtotal * (numEditDiscount / 100)
      : Math.min(editSubtotal, numEditDiscount)
    : 0;
  const editFinalTotal = Number(Math.max(0, editSubtotal - editDiscountAmount).toFixed(2));

  const handleSaveEdit = () => {
    if (!editOrder) return;
    
    const wasPaid = editOrder.paid;
    const parsedPaidDate = ePaid ? new Date(ePaidDate).getTime() : undefined;
    const wasCancelled = editOrder.status === 'Cancelled';
    const isCancelled = eStatus === 'Cancelled';
    const newTotal = editFinalTotal;

    const updated = orders.map(o => {
      if (o.id === editOrder.id) {
        return {
          ...o,
          status: eStatus,
          personnel: ePersonnel || null,
          paid: ePaid,
          paidDate: parsedPaidDate,
          containerReturn: eReturn,
          subtotal: Number(editSubtotal.toFixed(2)),
          discountType: numEditDiscount > 0 ? eDiscountType : undefined,
          discountValue: numEditDiscount > 0 ? numEditDiscount : undefined,
          discountAmount: numEditDiscount > 0 ? Number(editDiscountAmount.toFixed(2)) : undefined,
          total: newTotal
        };
      }
      return o;
    });

    if (!wasCancelled && isCancelled) {
      // Refilling inventory
      setInventory({ ...inventory, [editOrder.type]: inventory[editOrder.type] + editOrder.qty });
      
      // If it's cancelled and was unpaid, reduce the customer's balance.
      if (!wasPaid) {
        updateCustomerBalance(editOrder.customerId, -editOrder.total);
      }
    } else if (wasCancelled && !isCancelled) {
      // Un-cancelling (rare, but possible)
      setInventory({ ...inventory, [editOrder.type]: inventory[editOrder.type] - editOrder.qty });
      if (!ePaid) {
        updateCustomerBalance(editOrder.customerId, newTotal);
      }
    } else {
      // Normal flow (no cancellation state change)
      if (!wasPaid && ePaid) {
        updateCustomerBalance(editOrder.customerId, -editOrder.total);
      } else if (wasPaid && !ePaid) {
        updateCustomerBalance(editOrder.customerId, newTotal);
      } else if (!wasPaid && !ePaid) {
        // Unpaid before and after: adjust for total changes (e.g. discount applied or adjusted)
        const diff = newTotal - editOrder.total;
        if (diff !== 0) {
          updateCustomerBalance(editOrder.customerId, diff);
        }
      }
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

  const markClaimed = (order: Order) => {
    const updated = orders.map(o => o.id === order.id ? { ...o, status: 'Claimed' as const, claimedAt: Date.now() } : o);
    setOrders(updated);
    toast.success('Order marked as Claimed');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">Orders</h1>
          <p className="text-brand-gray">Manage customer orders and recurring subscriptions</p>
        </div>
        <button
          onClick={handleOpenWalkIn}
          className="btn btn-primary bg-brand-blue border-brand-blue text-white px-5 py-2.5 rounded-full hover:bg-brand-blue-dark flex items-center gap-1.5 font-bold shadow-md hover:shadow-lg transition-all"
        >
          Add Walk-in <span className="text-lg">⊕</span>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 bg-white p-2 border border-brand-border rounded-xl w-fit">
        <button 
          onClick={() => setView('orders')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'orders' ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-gray hover:bg-brand-gray-light'}`}
        >
          Orders
        </button>
        <button 
          onClick={() => setView('subscriptions')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${view === 'subscriptions' ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-gray hover:bg-brand-gray-light'}`}
        >
          Subscriptions
          {subscriptions.filter(s => s.active).length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${view === 'subscriptions' ? 'bg-white text-brand-blue' : 'bg-brand-blue text-white'}`}>
              {subscriptions.filter(s => s.active).length}
            </span>
          )}
        </button>
      </div>

      {view === 'orders' && (
      <div className="card">
        {/* Advanced Date Range & Quick Filters */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-brand-border/80 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-brand-dark uppercase tracking-wider">From:</label>
                <input 
                  type="date" 
                  className="form-control py-1.5 px-3 text-sm bg-white border-brand-border w-auto rounded-xl"
                  value={dateFrom} 
                  onChange={e => { setDateFrom(e.target.value); setActiveDateFilter('custom'); }} 
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-brand-dark uppercase tracking-wider">To:</label>
                <input 
                  type="date" 
                  className="form-control py-1.5 px-3 text-sm bg-white border-brand-border w-auto rounded-xl"
                  value={dateTo} 
                  onChange={e => { setDateTo(e.target.value); setActiveDateFilter('custom'); }} 
                />
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-brand-gray mr-1">Quick Filters:</span>
              <button
                type="button"
                onClick={() => applyQuickDateFilter('today')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeDateFilter === 'today' ? 'bg-brand-blue text-white shadow-xs' : 'bg-white border border-brand-border text-slate-700 hover:bg-slate-100'}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyQuickDateFilter('yesterday')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeDateFilter === 'yesterday' ? 'bg-brand-blue text-white shadow-xs' : 'bg-white border border-brand-border text-slate-700 hover:bg-slate-100'}`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyQuickDateFilter('7days')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeDateFilter === '7days' ? 'bg-brand-blue text-white shadow-xs' : 'bg-white border border-brand-border text-slate-700 hover:bg-slate-100'}`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyQuickDateFilter('month')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeDateFilter === 'month' ? 'bg-brand-blue text-white shadow-xs' : 'bg-white border border-brand-border text-slate-700 hover:bg-slate-100'}`}
              >
                This Month
              </button>
              {(dateFrom || dateTo || activeDateFilter) && (
                <button
                  type="button"
                  onClick={() => applyQuickDateFilter('clear')}
                  className="px-2.5 py-1 text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="form-control w-auto py-2 px-3 text-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Claimed">Claimed</option>
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
                  <td className="font-bold">
                    {o.customerName}
                    {o.method === 'delivery' && o.address && (
                      <div className="text-[10px] font-normal text-brand-gray mt-1 truncate max-w-[150px]" title={o.address}>📍 {o.address}</div>
                    )}
                    {o.deliveryNotes && (
                      <div 
                        className="text-[10px] font-normal text-brand-blue bg-blue-50 px-1 py-0.5 rounded mt-1 truncate max-w-[150px] cursor-pointer hover:bg-blue-100 transition-colors" 
                        title="Click to view full note"
                        onClick={() => setViewNote({ customerName: o.customerName, text: o.deliveryNotes! })}
                      >
                        📝 {o.deliveryNotes}
                      </div>
                    )}
                  </td>
                  <td>{o.type === 'slim' ? '🔵 Slim' : '🟢 Round'}</td>
                  <td>{o.qty}</td>
                  <td>{o.method === 'delivery' ? '🚚 Delivery' : '🏪 Pick-up'}</td>
                  <td className="font-bold text-brand-dark">
                    <div>₱{formatCurrency(o.total)}</div>
                    {o.discountAmount && o.discountAmount > 0 ? (
                      <div className="text-[10px] text-brand-green font-semibold">
                        -{o.discountType === 'percentage' ? `${o.discountValue}%` : `₱${formatCurrency(o.discountAmount)}`} off
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <div>
                        <span className={`badge ${o.paid ? 'badge-paid' : 'badge-unpaid'} mr-2`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                        {o.paymentMethod && <span className="text-[10px] text-brand-gray font-semibold tracking-wider">{o.paymentMethod.toUpperCase()}</span>}
                      </div>
                      {o.referenceNumber && (
                        <div className="text-[10px] font-mono text-brand-gray mt-0.5">
                          Ref: {o.referenceNumber}
                        </div>
                      )}
                      {o.paid && o.paidDate && (
                        <span className="text-[10.5px] text-brand-green font-bold mt-1">
                          Paid: {new Date(o.paidDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${o.status === 'Pending' ? 'badge-pending' : o.status === 'Out for Delivery' ? 'badge-delivery' : o.status === 'Claimed' ? 'badge-delivered' : o.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'badge-delivered'}`}>{o.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(o)}>Edit</button>
                      {o.method === 'pickup' && (o.status === 'Pending' || o.status === 'Out for Delivery') && (
                        <button className="btn btn-sm bg-brand-green-light text-brand-green border border-brand-green/20 hover:bg-green-100 font-semibold shadow-xs" onClick={() => markClaimed(o)}>Claimed</button>
                      )}
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
      )}

      {view === 'subscriptions' && (
        <div className="card">
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <h2 className="font-heading text-xl font-bold text-brand-dark">Recurring Subscriptions</h2>
            <div className="text-sm text-brand-gray ml-auto">Manage automated scheduled deliveries</div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table-container">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Interval</th>
                  <th>Next Delivery</th>
                  <th>Address</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} className={!sub.active ? "opacity-50" : ""}>
                    <td className="font-bold text-brand-dark">{sub.customerName}</td>
                    <td>
                      <span className="font-semibold text-brand-dark">{sub.qty}x</span>{' '}
                      <span className="text-xs text-brand-gray uppercase tracking-wider font-bold">{sub.type}</span>
                    </td>
                    <td>
                      {(!sub.scheduleType || sub.scheduleType === 'interval') && <span className="badge badge-paid">Every {sub.intervalDays} days</span>}
                      {sub.scheduleType === 'weekly' && <span className="badge badge-paid">Weekly: {sub.weeklyDays?.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}</span>}
                      {sub.scheduleType === 'exact' && <span className="badge badge-delivered">One-time: {new Date(sub.exactDate!).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>}
                    </td>
                    <td className="text-sm font-semibold">
                      {sub.active ? (
                        new Date(sub.nextDeliveryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      ) : (
                        <span className="text-brand-gray">Cancelled</span>
                      )}
                    </td>
                    <td className="text-xs text-brand-gray max-w-[200px] truncate">{sub.address}</td>
                    <td className="text-right">
                      {sub.active && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Create a pending order for ${sub.customerName} and update the next delivery date?`)) {
                              const newOrder: Order = {
                                id: 'o' + Date.now(),
                                customerId: sub.customerId,
                                customerName: sub.customerName,
                                type: sub.type,
                                qty: sub.qty,
                                method: 'delivery',
                                paymentMethod: 'cash', // Defaulting to cash for recurring deliveries
                                status: 'Pending',
                                total: sub.qty * getUnitPrice(sub.type),
                                paid: false,
                                date: Date.now(),
                                personnel: null,
                                address: sub.address,
                                containerReturn: false,
                                deliveryNotes: sub.deliveryNotes
                              };
                              setOrders([newOrder, ...orders]);
                              setInventory({ ...inventory, [sub.type]: inventory[sub.type] - sub.qty });
                              
                              const customer = customers.find(c => c.id === sub.customerId);
                              if (customer) {
                                updateCustomerBalance(sub.customerId, newOrder.total);
                              }

                              let nextDelivery = sub.nextDeliveryDate;
                              let isActive = sub.active;
                              
                              if (!sub.scheduleType || sub.scheduleType === 'interval') {
                                nextDelivery = sub.nextDeliveryDate + ((sub.intervalDays || 7) * 24 * 60 * 60 * 1000);
                              } else if (sub.scheduleType === 'weekly' && sub.weeklyDays?.length) {
                                let d = new Date(sub.nextDeliveryDate);
                                d.setDate(d.getDate() + 1);
                                d.setHours(0,0,0,0);
                                while (!sub.weeklyDays.includes(d.getDay())) {
                                  d.setDate(d.getDate() + 1);
                                }
                                nextDelivery = d.getTime();
                              } else if (sub.scheduleType === 'exact') {
                                isActive = false;
                              }

                              setSubscriptions(subscriptions.map(s => 
                                s.id === sub.id ? { ...s, nextDeliveryDate: nextDelivery, active: isActive } : s
                              ));
                              alert('Order created successfully!');
                            }
                          }}
                          className="text-xs font-bold bg-[#0a6ed1] hover:bg-[#085ab3] text-white px-3 py-1.5 rounded-full transition-colors mr-2"
                        >
                          Trigger Order
                        </button>
                      )}
                      {sub.active ? (
                        <button 
                          onClick={() => {
                            if (window.confirm('Cancel this subscription?')) {
                              setSubscriptions(subscriptions.map(s => s.id === sub.id ? { ...s, active: false } : s));
                            }
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            let nextDelivery = Date.now();
                            if (!sub.scheduleType || sub.scheduleType === 'interval') {
                              nextDelivery += ((sub.intervalDays || 7) * 24 * 60 * 60 * 1000);
                            } else if (sub.scheduleType === 'weekly' && sub.weeklyDays?.length) {
                              let d = new Date();
                              d.setDate(d.getDate() + 1);
                              d.setHours(0,0,0,0);
                              while (!sub.weeklyDays.includes(d.getDay())) {
                                d.setDate(d.getDate() + 1);
                              }
                              nextDelivery = d.getTime();
                            } else if (sub.scheduleType === 'exact') {
                              alert("One-time scheduled exact dates cannot be reactivated once completed. Please create a new schedule.");
                              return;
                            }
                            setSubscriptions(subscriptions.map(s => s.id === sub.id ? { ...s, active: true, nextDeliveryDate: nextDelivery } : s));
                          }}
                          className="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-brand-gray">
                      No subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {viewNote && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={() => setViewNote(null)}>
          <div 
            className="bg-white rounded-[2rem] border-[2.5px] border-slate-900/85 p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 font-bold transition-all hover:bg-slate-100" 
              onClick={() => setViewNote(null)}
            >
              ×
            </button>
            <h3 className="font-heading text-xl font-bold mb-4 text-brand-dark">Customer Note</h3>
            <p className="text-sm font-semibold text-brand-gray mb-2">From: {viewNote.customerName}</p>
            <div className="bg-brand-gray-light p-4 rounded-xl border border-brand-border text-sm text-brand-dark whitespace-pre-wrap break-words">
              {viewNote.text}
            </div>
            <div className="mt-6">
              <button 
                onClick={() => setViewNote(null)}
                className="w-full btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h3 className="font-heading text-2xl font-black text-center mb-6 text-slate-800">New Order</h3>
            
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Method</label>
                <div className="relative">
                  <select 
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 appearance-none shadow-xs"
                    value={walkInMethod} 
                    onChange={e => setWalkInMethod(e.target.value as any)}
                  >
                    <option value="pickup">Pick-up / Walk-in</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              {walkInMethod === 'delivery' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Delivery Address</label>
                  <input 
                    type="text"
                    className="w-full rounded-full border-[2px] border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-slate-800 shadow-xs"
                    placeholder="Enter delivery address"
                    value={walkInAddress}
                    onChange={e => setWalkInAddress(e.target.value)}
                  />
                </div>
              )}

              {/* Customizable Discount for Walk-in */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Discount</label>
                  <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
                    <button
                      type="button"
                      onClick={() => setWalkInDiscountType('percentage')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${walkInDiscountType === 'percentage' ? 'bg-brand-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalkInDiscountType('flat')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${walkInDiscountType === 'flat' ? 'bg-brand-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      ₱ Flat
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step={walkInDiscountType === 'percentage' ? '1' : '0.5'}
                    max={walkInDiscountType === 'percentage' ? '100' : undefined}
                    placeholder={walkInDiscountType === 'percentage' ? 'e.g. 5 (for 5%)' : 'e.g. 50 (for ₱50)'}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-brand-blue"
                    value={walkInDiscountVal}
                    onChange={e => setWalkInDiscountVal(e.target.value)}
                  />
                  {walkInDiscountVal && parseFloat(walkInDiscountVal) > 0 && (
                    <button
                      type="button"
                      onClick={() => setWalkInDiscountVal('')}
                      className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {walkInDiscountAmount > 0 && (
                  <div className="mt-2 text-xs text-brand-green font-bold flex justify-between">
                    <span>Discount Deduction:</span>
                    <span>-₱{walkInDiscountAmount.toFixed(2)} {walkInDiscountType === 'percentage' ? `(${walkInDiscountVal}%)` : ''}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Final Total</label>
                <div className="w-full rounded-full border-[2px] border-slate-300 py-3 text-center text-lg font-black text-slate-850 bg-slate-50 shadow-inner">
                  ₱{walkInFinalTotal.toFixed(2)}
                  {walkInDiscountAmount > 0 && (
                    <span className="text-xs font-normal text-slate-400 line-through ml-2">₱{walkInSubtotal.toFixed(2)}</span>
                  )}
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
                  {editOrder.deliveryNotes && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm mb-4 whitespace-pre-wrap break-words">
                      <strong className="block mb-1">Delivery Notes:</strong>
                      {editOrder.deliveryNotes}
                    </div>
                  )}
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
                        <option value="Claimed">Claimed</option>
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

              {/* Customizable Discount for Edit Order */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Discount</label>
                  <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
                    <button
                      type="button"
                      onClick={() => setEDiscountType('percentage')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${eDiscountType === 'percentage' ? 'bg-brand-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setEDiscountType('flat')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${eDiscountType === 'flat' ? 'bg-brand-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      ₱ Flat
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step={eDiscountType === 'percentage' ? '1' : '0.5'}
                    max={eDiscountType === 'percentage' ? '100' : undefined}
                    placeholder={eDiscountType === 'percentage' ? 'e.g. 5 (for 5%)' : 'e.g. 50 (for ₱50)'}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 bg-white outline-none focus:border-brand-blue"
                    value={eDiscountVal}
                    onChange={e => setEDiscountVal(e.target.value)}
                  />
                  {eDiscountVal && parseFloat(eDiscountVal) > 0 && (
                    <button
                      type="button"
                      onClick={() => setEDiscountVal('')}
                      className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-2 text-xs flex justify-between font-bold text-slate-700">
                  <span>Subtotal:</span>
                  <span>₱{editSubtotal.toFixed(2)}</span>
                </div>
                {editDiscountAmount > 0 && (
                  <div className="mt-1 text-xs text-brand-green font-bold flex justify-between">
                    <span>Discount:</span>
                    <span>-₱{editDiscountAmount.toFixed(2)} {eDiscountType === 'percentage' ? `(${eDiscountVal}%)` : ''}</span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200 text-sm font-black text-slate-900 flex justify-between">
                  <span>Updated Total:</span>
                  <span>₱{editFinalTotal.toFixed(2)}</span>
                </div>
              </div>

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
