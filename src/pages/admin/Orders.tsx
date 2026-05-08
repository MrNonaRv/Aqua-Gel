import { useState } from 'react';
import { useStore, Order } from '../../lib/store';
import { notifyStatusChange } from '../../lib/notifications';

export default function Orders() {
  const { orders, setOrders, personnel, updateCustomerBalance } = useStore();
  const [statusF, setStatusF] = useState('');
  const [paidF, setPaidF] = useState('');
  const [methodF, setMethodF] = useState('');
  const [searchF, setSearchF] = useState('');

  const [editOrder, setEditOrder] = useState<Order | null>(null);
  
  // Edited values
  const [eStatus, setEStatus] = useState<Order['status']>('Pending');
  const [ePersonnel, setEPersonnel] = useState<string>('');
  const [ePaid, setEPaid] = useState<boolean>(false);
  const [eReturn, setEReturn] = useState<boolean>(false);

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
  };

  const handleSaveEdit = () => {
    if (!editOrder) return;
    
    const wasPaid = editOrder.paid;
    
    const updated = orders.map(o => {
      if (o.id === editOrder.id) {
        return {
          ...o,
          status: eStatus,
          personnel: ePersonnel || null,
          paid: ePaid,
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
    const updated = orders.map(o => o.id === order.id ? { ...o, paid: true } : o);
    updateCustomerBalance(order.customerId, -order.total);
    setOrders(updated);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-1">Orders</h1>
        <p className="text-brand-gray">Manage all customer orders and refill transactions</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-6">
          <select className="form-control w-auto py-2 px-3 text-sm" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
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
                  <td className="font-bold">₱{o.total}</td>
                  <td>
                    <span className={`badge ${o.paid ? 'badge-paid' : 'badge-unpaid'} mr-2`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                    {o.paymentMethod && <span className="text-xs text-brand-gray">{o.paymentMethod.toUpperCase()}</span>}
                  </td>
                  <td><span className={`badge ${o.status === 'Pending' ? 'badge-pending' : o.status === 'Out for Delivery' ? 'badge-delivery' : 'badge-delivered'}`}>{o.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(o)}>Edit</button>
                      {!o.paid && (
                        <button className="btn btn-sm bg-brand-green-light text-brand-green hover:bg-[#c8e6c9]" onClick={() => markPaid(o)}>Mark Paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-brand-gray">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-xl font-bold">Edit Order</h3>
              <button className="text-xl text-brand-gray hover:text-brand-dark" onClick={() => setEditOrder(null)}>×</button>
            </div>
            
            <div className="form-group">
              <label>Order Status</label>
              <select className="form-control" title="Order Status" value={eStatus} onChange={e => setEStatus(e.target.value as any)}>
                <option value="Pending">Pending</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            {editOrder.method === 'delivery' && (
              <div className="form-group">
                <label>Assign Delivery Personnel</label>
                <select className="form-control" title="Delivery Personnel" value={ePersonnel} onChange={e => setEPersonnel(e.target.value)}>
                  <option value="">— None —</option>
                  {personnel.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Payment Status</label>
              <select className="form-control" title="Payment Status" value={ePaid ? "1" : "0"} onChange={e => setEPaid(e.target.value === "1")}>
                <option value="0">Unpaid</option>
                <option value="1">Paid</option>
              </select>
            </div>

            <div className="form-group mb-8">
              <label>Container Return</label>
              <select className="form-control" title="Container Return" value={eReturn ? "1" : "0"} onChange={e => setEReturn(e.target.value === "1")}>
                <option value="0">Not Returned</option>
                <option value="1">Returned</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setEditOrder(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
