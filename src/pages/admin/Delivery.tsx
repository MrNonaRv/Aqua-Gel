import { useState } from 'react';
import { useStore } from '../../lib/store';
import { notifyStatusChange } from '../../lib/notifications';
import { Mailbox, Truck, CheckCircle2, User, X } from 'lucide-react';

export default function Delivery() {
  const { orders, setOrders, personnel, setPersonnel } = useStore();
  const deliveryOrders = orders.filter(o => o.method === 'delivery');

  const addPersonnel = () => {
    const name = prompt('Enter delivery personnel name:');
    if (!name || !name.trim()) return;
    setPersonnel([...personnel, name.trim()]);
  };

  const removePersonnel = (name: string) => {
    setPersonnel(personnel.filter(p => p !== name));
  };

  const assignPersonnel = (orderId: string, name: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, personnel: name || null } : o));
  };

  const updateStatus = (orderId: string, status: any) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    
    if (order.status !== status) {
      notifyStatusChange(order.customerId, order.id, status);
    }
  };

  const toggleReturn = (orderId: string, val: boolean) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, containerReturn: val } : o));
  };

  const kanbanColumns = [
    { status: 'Pending', icon: <Mailbox size={18} />, color: 'text-brand-amber', items: deliveryOrders.filter(o => o.status === 'Pending') },
    { status: 'Out for Delivery', icon: <Truck size={18} />, color: 'text-brand-blue', items: deliveryOrders.filter(o => o.status === 'Out for Delivery') },
    { status: 'Delivered', icon: <CheckCircle2 size={18} />, color: 'text-brand-green', items: deliveryOrders.filter(o => o.status === 'Delivered') }
  ];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="font-heading text-3xl font-bold mb-1">Delivery Tracking</h1>
        <p className="text-brand-gray">Assign personnel and track delivery statuses in real time</p>
      </div>

      <div className="card shrink-0 mb-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-bold">Manage Delivery Personnel</h2>
          <button className="btn btn-primary btn-sm" onClick={addPersonnel}>+ Add Personnel</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {personnel.length > 0 ? personnel.map(p => (
            <div key={p} className="flex items-center gap-2 bg-brand-gray-light px-3 py-1.5 rounded-lg text-sm font-medium">
              <User size={14} className="text-brand-gray" /> {p}
              <button className="text-brand-gray hover:text-brand-red ml-1" onClick={() => removePersonnel(p)}><X size={14} /></button>
            </div>
          )) : (
            <span className="text-brand-gray text-sm">No personnel added yet.</span>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {kanbanColumns.map(col => (
          <div key={col.status} className="bg-brand-gray-light rounded-2xl p-4 flex flex-col h-full">
            <div className={`flex items-center gap-2 mb-4 font-semibold text-sm ${col.color}`}>
              {col.icon}
              <span>{col.status}</span>
              <span className="bg-white text-brand-dark px-2.5 py-0.5 rounded-full text-xs font-bold ml-auto shadow-sm">
                {col.items.length}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {col.items.length > 0 ? col.items.map(o => (
                <div key={o.id} className="bg-white rounded-xl border border-brand-border p-4 shadow-sm relative group">
                  <div className="font-bold text-sm mb-1">{o.customerName}</div>
                  <div className="text-xs text-brand-gray mb-3 flex items-start gap-1">
                    <span className="mt-0.5">📍</span> {o.address || '—'}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`badge ${o.type === 'slim' ? 'badge-delivery' : 'badge-delivered'} text-[10px]`}>
                      {o.type === 'slim' ? '🔵 Slim' : '🟢 Round'} ×{o.qty}
                    </span>
                    <span className="text-xs text-brand-gray font-medium">₱{o.total}</span>
                    <span className={`badge ${o.paid ? 'badge-paid' : 'badge-unpaid'} text-[10px]`}>{o.paid ? 'Paid' : 'Unpaid'}</span>
                  </div>

                  {o.personnel && <div className="text-xs text-brand-gray mb-2 flex items-center gap-1"><User size={12}/> {o.personnel}</div>}
                  
                  <div className="pt-3 border-t border-[#f0f3f8] mt-2">
                    <select 
                      className="w-full bg-brand-gray-light border-none rounded-lg px-2 py-1.5 text-xs font-medium outline-none mb-3 cursor-pointer text-brand-dark focus:ring-1 focus:ring-brand-blue" 
                      value={o.personnel || ''} 
                      title="Assign personnel"
                      onChange={e => assignPersonnel(o.id, e.target.value)}
                    >
                      <option value="">Assign personnel...</option>
                      {personnel.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {['Pending', 'Out for Delivery', 'Delivered'].map(s => (
                        <button 
                          key={s}
                          className={`flex-1 py-1 px-2 rounded-md border text-[10px] font-semibold transition-colors
                            ${o.status === s 
                              ? 'bg-brand-blue border-brand-blue text-white' 
                              : 'bg-white border-brand-border text-brand-gray hover:border-brand-blue hover:text-brand-blue'
                            }`}
                          onClick={() => updateStatus(o.id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 text-xs text-brand-gray cursor-pointer group-hover:text-brand-dark transition-colors">
                      <input 
                        type="checkbox" 
                        checked={o.containerReturn} 
                        onChange={e => toggleReturn(o.id, e.target.checked)} 
                        className="rounded border-brand-border text-brand-blue focus:ring-brand-blue"
                      />
                      Container returned
                    </label>
                  </div>
                </div>
              )) : (
                <div className="text-center p-6 text-brand-gray">
                  <div className="text-4xl mb-2 opacity-50">📭</div>
                  <p className="text-sm">No orders here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
